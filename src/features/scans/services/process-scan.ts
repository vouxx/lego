import "server-only";
import { reportError } from "@/lib/monitoring";
import {
  auditDependencies,
  codeContext,
  fingerprint,
  maskSecrets,
  runRules,
  STATIC_RULES,
  type Candidate,
} from "@lego/scanner";
import { readRepoAtCommit } from "@/lib/github/repo-files";
import { isLlmConfigured, type LlmUsage } from "@/lib/llm";
import type { Insert } from "@/lib/supabase/types";
import {
  addTokenUsage,
  getScanForWorker,
  insertLlmCall,
  listIgnoredFingerprintsBefore,
  replaceFindings,
  updateScan,
} from "../repository";
import { SEVERITIES, type ScanSummary } from "../schemas";
import { explain, triage, type JudgeItem } from "./judge";

const RULE_TITLES = new Map([
  ...STATIC_RULES.map((r) => [r.id, r.title] as const),
  ["SEC-014", "알려진 취약점이 있는 의존성 버전"] as const,
]);
const MAX_SNIPPET_LINES = 12;

function stackLabel(detected: unknown) {
  const tags = (detected as { tags?: unknown })?.tags;
  return Array.isArray(tags) && tags.length > 0
    ? tags.join(", ")
    : "알 수 없음";
}

function snippetOf(candidate: Candidate) {
  return maskSecrets(
    candidate.snippet.split("\n").slice(0, MAX_SNIPPET_LINES).join("\n"),
  );
}

/**
 * 스캔 하나를 끝까지 실행한다. GitHub·DB 처럼 다시 시도하면 나을 수 있는 실패는 throw 하고,
 * LLM 실패는 스캔을 멈추지 않고 정적 탐지 결과만 저장한다.
 */
export async function processScan(scanId: string) {
  const { data: scan, error } = await getScanForWorker(scanId);
  if (error) throw new Error(`스캔 조회 실패: ${error.message}`);
  if (!scan || scan.status === "done") return;
  const project = scan.projects;
  if (!project || !scan.commit_sha)
    throw new Error("스캔의 프로젝트나 커밋 정보가 없습니다.");

  const setProgress = async (progress: number) => {
    await updateScan(scanId, { progress: Math.round(progress) });
  };
  await updateScan(scanId, {
    status: "running",
    progress: 5,
    started_at: new Date().toISOString(),
    error: null,
  });

  // 1. 리포 읽기 + 정적 탐지
  const snapshot = await readRepoAtCommit(
    { installationId: project.installation_id },
    project.repo_full_name,
    scan.commit_sha,
  );
  const { candidates } = runRules(snapshot);

  // SEC-014 는 OSV 에 물어본다. 실패해도 나머지 결과는 저장한다.
  let dependencyNote: string | null = null;
  try {
    candidates.push(...(await auditDependencies(snapshot)));
  } catch (error) {
    dependencyNote =
      "의존성 취약점 데이터베이스(OSV)에 연결하지 못해 SEC-014 를 건너뛰었습니다.";
    reportError(error, { area: "osv", extra: { scanId } });
  }
  await setProgress(25);

  const byFingerprint = new Map<string, Candidate>();
  for (const c of candidates) {
    const fp = fingerprint(c);
    if (!byFingerprint.has(fp)) byFingerprint.set(fp, c);
  }
  const files = new Map(snapshot.files.map((f) => [f.path, f]));
  const items: (JudgeItem & { fingerprint: string; candidate: Candidate })[] = [
    ...byFingerprint,
  ].map(([fp, c], id) => ({
    id,
    fingerprint: fp,
    candidate: c,
    ruleId: c.ruleId,
    ruleTitle: RULE_TITLES.get(c.ruleId) ?? c.ruleId,
    filePath: c.filePath,
    lineStart: c.lineStart,
    lineEnd: c.lineEnd,
    reason: c.reason,
    context: codeContext(files.get(c.filePath), c),
  }));
  await setProgress(30);

  // 2. LLM 판별 → 설명·수정 프롬프트
  let costUsd = 0;
  let llm: ScanSummary["llm"] = "done";
  let llmNote: string | null = null;
  const onUsage = async (purpose: "triage" | "explain", usage: LlmUsage) => {
    costUsd += usage.costUsd;
    await insertLlmCall({
      user_id: scan.user_id,
      scan_id: scanId,
      purpose,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
      latency_ms: usage.latencyMs,
    });
    const { data: hasRemaining } = await addTokenUsage(
      scan.user_id,
      usage.inputTokens + usage.outputTokens,
    );
    return hasRemaining !== false;
  };

  const stack = stackLabel(project.detected_stack);
  let verdicts = new Map<
    number,
    {
      verdict: "true_positive" | "false_positive" | "uncertain";
      reason: string;
    }
  >();
  let texts = new Map<number, { explanation: string; fixPrompt: string }>();

  if (items.length === 0) {
    llmNote = null;
  } else if (!isLlmConfigured()) {
    llm = "skipped";
    llmNote =
      "ANTHROPIC_API_KEY 가 없어 AI 판별과 수정 프롬프트를 건너뛰었습니다.";
  } else {
    const triaged = await triage(items, stack, onUsage, (done, total) =>
      setProgress(30 + (40 * done) / total),
    );
    verdicts = triaged.verdicts;
    const confirmed = items.filter(
      (i) => verdicts.get(i.id)?.verdict !== "false_positive",
    );

    if (triaged.stopped) {
      llm = "partial";
      llmNote =
        "이번 달 LLM 토큰 한도를 넘어 일부 항목은 AI 판별을 하지 못했습니다.";
    } else if (confirmed.length > 0) {
      const explained = await explain(
        confirmed,
        stack,
        onUsage,
        (done, total) => setProgress(70 + (25 * done) / total),
      );
      texts = explained.results;
      if (explained.stopped) {
        llm = "partial";
        llmNote =
          "이번 달 LLM 토큰 한도를 넘어 일부 항목은 수정 프롬프트를 만들지 못했습니다.";
      } else if (texts.size < confirmed.length) {
        llm = "partial";
        llmNote = `${confirmed.length - texts.size}개 항목은 수정 프롬프트를 만들지 못했습니다.`;
      }
    }
  }

  // 3. 저장. 직전 스캔에서 무시한 항목은 계속 무시 상태로 둔다.
  const { data: ignored } = await listIgnoredFingerprintsBefore(scanId);
  const ignoredSet = new Set(ignored);
  const rows: Insert<"findings">[] = items.map((item) => ({
    scan_id: scanId,
    user_id: scan.user_id,
    rule_id: item.ruleId,
    severity: item.candidate.severity,
    file_path: item.filePath,
    line_start: item.lineStart,
    line_end: item.lineEnd,
    snippet: snippetOf(item.candidate),
    fingerprint: item.fingerprint,
    ai_verdict: verdicts.get(item.id)?.verdict ?? null,
    explanation: texts.get(item.id)?.explanation ?? null,
    fix_prompt: texts.get(item.id)?.fixPrompt ?? null,
    status: ignoredSet.has(item.fingerprint) ? "ignored" : "open",
  }));
  const { error: saveError } = await replaceFindings(scanId, rows);
  if (saveError) throw new Error(`발견 항목 저장 실패: ${saveError.message}`);

  const visible = rows.filter((r) => r.ai_verdict !== "false_positive");
  const summary: ScanSummary = {
    total: visible.length,
    bySeverity: Object.fromEntries(
      SEVERITIES.map((s) => [
        s,
        visible.filter((r) => r.severity === s).length,
      ]),
    ) as ScanSummary["bySeverity"],
    falsePositives: rows.length - visible.length,
    filesScanned: snapshot.files.length,
    truncated: snapshot.truncated,
    llm,
    llmNote,
    dependencyNote,
    costUsd: Math.round(costUsd * 10000) / 10000,
  };

  await updateScan(scanId, {
    status: "done",
    progress: 100,
    summary,
    finished_at: new Date().toISOString(),
  });
}
