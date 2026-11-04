import "server-only";
import {
  codeContext,
  maskSecrets,
  parsePatch,
  PR_RULES,
  reviewPullRequest,
  STATIC_RULES,
  type Candidate,
  type ChangedFile,
} from "@lego/scanner";
import {
  completeCheckRun,
  createCheckRun,
  createPullReview,
  listPullFiles,
  readFileAtRef,
  type CheckAnnotation,
} from "@/lib/github/pulls";
import { isLlmConfigured, type LlmUsage } from "@/lib/llm";
import { reportError } from "@/lib/monitoring";
import type { Insert } from "@/lib/supabase/types";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  addTokenUsage,
  getPrReviewForWorker,
  insertLlmCall,
  insertPrReview,
  listGuardedProjects,
  replacePrReviewFindings,
  updatePrReview,
} from "../repository";
import {
  pullRequestEvent,
  SEVERITIES,
  type PrReviewSummary,
  type Severity,
} from "../schemas";
import { explain, triage, type JudgeItem } from "./judge";
import { PR_FIX_PROMPTS } from "./pr-guard-prompts";

const CHECK_NAME = "레고 PR 가드";
const REVIEWED_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);
// 내용을 읽어 보안 규칙을 돌릴 파일. 나머지(이미지, 문서)는 patch 만 본다.
const READ_CONTENT = /\.(?:[cm]?[jt]sx?|sql)$|(^|\/)package\.json$/;
const MAX_CONTENT_FILES = 60;
const MAX_COMMENTS = 20;
const ENV_TEMPLATES = [".env.example", ".env.local.example", ".env.sample"];

const RULE_TITLES = new Map<string, string>([
  ...STATIC_RULES.map((r) => [r.id, r.title] as const),
  ...PR_RULES.map((r) => [r.id, r.title] as const),
]);

export type PendingReview = { reviewId: string };

/**
 * pull_request webhook: PR 가드를 켠 프로젝트마다 리뷰를 하나 만든다.
 * 같은 커밋으로 다시 오면(GitHub 재전송) 새로 만들지 않는다. 처리는 호출한 쪽이 after() 로 돌린다.
 */
export async function handlePullRequestEvent(
  payload: unknown,
): Promise<Result<{ handled: boolean; reviews: PendingReview[] }>> {
  const parsed = pullRequestEvent.safeParse(payload);
  if (!parsed.success)
    return err("invalid_payload", "pull_request 이벤트 형식이 다릅니다.");
  const event = parsed.data;
  if (
    !event.installation ||
    !REVIEWED_ACTIONS.has(event.action) ||
    event.pull_request.draft
  )
    return ok({ handled: false, reviews: [] });

  const { data: projects, error } = await listGuardedProjects(
    event.installation.id,
    event.repository.full_name,
  );
  if (error) return err("db_error", error.message);

  const reviews: PendingReview[] = [];
  for (const project of projects ?? []) {
    const { data, error: insertError } = await insertPrReview({
      project_id: project.id,
      user_id: project.user_id,
      pr_number: event.pull_request.number,
      pr_title: event.pull_request.title.slice(0, 300),
      pr_url: event.pull_request.html_url,
      head_sha: event.pull_request.head.sha,
    });
    if (insertError) return err("db_error", insertError.message);
    if (data) reviews.push({ reviewId: data.id });
  }
  return ok({ handled: reviews.length > 0, reviews });
}

function stackLabel(detected: unknown) {
  const tags = (detected as { tags?: unknown })?.tags;
  return Array.isArray(tags) && tags.length > 0
    ? tags.join(", ")
    : "알 수 없음";
}

const LEVEL: Record<Severity, CheckAnnotation["annotation_level"]> = {
  critical: "failure",
  high: "failure",
  medium: "warning",
  low: "notice",
};

function conclusionOf(counts: Partial<Record<Severity, number>>) {
  if ((counts.critical ?? 0) + (counts.high ?? 0) > 0)
    return "failure" as const;
  if ((counts.medium ?? 0) + (counts.low ?? 0) > 0) return "neutral" as const;
  return "success" as const;
}

function summaryMarkdown(
  rows: {
    rule_id: string;
    rule_title: string;
    severity: Severity;
    file_path: string;
    line: number;
  }[],
) {
  if (rows.length === 0)
    return "바뀐 줄에서 보안 문제나 위험한 변경을 찾지 못했습니다.";
  const order = (s: Severity) => SEVERITIES.indexOf(s);
  return [...rows]
    .sort((a, b) => order(a.severity) - order(b.severity))
    .map(
      (r) =>
        `- **${r.severity}** \`${r.rule_id}\` ${r.rule_title} — \`${r.file_path}:${r.line}\``,
    )
    .join("\n");
}

const detailsUrl = (projectId: string, reviewId: string) =>
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/projects/${projectId}/reviews/${reviewId}`
    : undefined;

/** GitHub 권한이 없을 때 사용자에게 보여 줄 말 */
function githubErrorNote(error: unknown, what: string) {
  const status = (error as { status?: number }).status;
  if (status === 403 || status === 404)
    return `${what}: GitHub App 에 권한이 없습니다(Pull requests·Checks 쓰기 권한 필요).`;
  return `${what}: GitHub 요청이 실패했습니다.`;
}

/**
 * 리뷰 하나를 끝까지 처리한다: 바뀐 파일 읽기 → 규칙 → (보안 규칙만) AI 판별·수정 프롬프트 → 저장 → GitHub 에 게시.
 * GitHub 게시가 실패해도 결과는 레고 화면에 남는다.
 */
export async function processPrReview(reviewId: string) {
  const { data: review, error } = await getPrReviewForWorker(reviewId);
  if (error) throw new Error(`PR 리뷰 조회 실패: ${error.message}`);
  const project = review?.projects;
  if (!review || !project?.installation_id || review.status === "done") return;
  const installationId = project.installation_id;
  const repo = project.repo_full_name;
  await updatePrReview(reviewId, { status: "running", error: null });

  const notes: string[] = [];
  let checkRunId: number | null = null;
  try {
    checkRunId = await createCheckRun(
      installationId,
      repo,
      review.head_sha,
      CHECK_NAME,
    );
  } catch (e) {
    notes.push(githubErrorNote(e, "상태 체크"));
  }

  try {
    // 1. 바뀐 파일과 최신 내용
    const pullFiles = await listPullFiles(
      installationId,
      repo,
      review.pr_number,
    );
    const files: ChangedFile[] = [];
    let read = 0;
    for (const f of pullFiles) {
      const status = f.status as ChangedFile["status"];
      let content: string | undefined;
      if (
        status !== "removed" &&
        READ_CONTENT.test(f.path) &&
        read < MAX_CONTENT_FILES
      ) {
        read++;
        content =
          (await readFileAtRef(
            installationId,
            repo,
            f.path,
            review.head_sha,
          )) ?? undefined;
      }
      files.push({ path: f.path, status, patch: f.patch, content });
    }
    const templates: string[] = [];
    for (const name of ENV_TEMPLATES) {
      const text = await readFileAtRef(
        installationId,
        repo,
        name,
        review.head_sha,
      );
      if (text !== null) templates.push(text);
    }

    // 2. 규칙
    const { candidates, errors } = reviewPullRequest(
      files,
      templates.length > 0 ? templates : null,
    );
    for (const e of errors)
      reportError(new Error(e.message), {
        area: "pr-guard.rule",
        extra: { reviewId, rule: e.ruleId },
      });
    const contents = new Map(
      files
        .filter((f) => f.content !== undefined)
        .map((f) => [f.path, { path: f.path, content: f.content! }]),
    );
    const items: (JudgeItem & { candidate: Candidate })[] = candidates.map(
      (c, id) => ({
        id,
        candidate: c,
        ruleId: c.ruleId,
        ruleTitle: RULE_TITLES.get(c.ruleId) ?? c.ruleId,
        filePath: c.filePath,
        lineStart: c.lineStart,
        lineEnd: c.lineEnd,
        reason: c.reason,
        context: codeContext(contents.get(c.filePath), c),
      }),
    );

    // 3. 보안 규칙 후보만 AI 판별·설명. PR 규칙은 diff 로 확정되므로 고정 안내를 쓴다.
    const security = items.filter((i) => i.ruleId.startsWith("SEC-"));
    let verdicts = new Map<
      number,
      {
        verdict: "true_positive" | "false_positive" | "uncertain";
        reason: string;
      }
    >();
    let texts = new Map<number, { explanation: string; fixPrompt: string }>();
    let llm: PrReviewSummary["llm"] =
      security.length === 0 ? undefined : "done";
    if (security.length > 0 && !isLlmConfigured()) {
      llm = "skipped";
    } else if (security.length > 0) {
      const onUsage = async (
        purpose: "triage" | "explain",
        usage: LlmUsage,
      ) => {
        await insertLlmCall({
          user_id: review.user_id,
          pr_review_id: reviewId,
          purpose: `pr-${purpose}`,
          model: usage.model,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cost_usd: usage.costUsd,
          latency_ms: usage.latencyMs,
        });
        const { data: hasRemaining } = await addTokenUsage(
          review.user_id,
          usage.inputTokens + usage.outputTokens,
        );
        return hasRemaining !== false;
      };
      const stack = stackLabel(project.detected_stack);
      const noop = async () => {};
      const triaged = await triage(security, stack, onUsage, noop);
      verdicts = triaged.verdicts;
      const confirmed = security.filter(
        (i) => verdicts.get(i.id)?.verdict !== "false_positive",
      );
      if (triaged.stopped) llm = "partial";
      else if (confirmed.length > 0) {
        const explained = await explain(confirmed, stack, onUsage, noop);
        texts = explained.results;
        if (explained.stopped || texts.size < confirmed.length) llm = "partial";
      }
    }

    // 4. 저장. AI 가 오탐이라 한 보안 후보는 게시하지 않고 기록만 남긴다.
    const rows: Insert<"pr_review_findings">[] = items.map((item) => ({
      review_id: reviewId,
      user_id: review.user_id,
      rule_id: item.ruleId,
      rule_title: item.ruleTitle,
      severity: item.candidate.severity,
      file_path: item.filePath,
      line: Math.max(1, item.lineStart),
      snippet: maskSecrets(
        item.candidate.snippet.split("\n").slice(0, 6).join("\n"),
      ),
      reason: item.reason,
      ai_verdict: verdicts.get(item.id)?.verdict ?? null,
      explanation: texts.get(item.id)?.explanation ?? null,
      fix_prompt:
        texts.get(item.id)?.fixPrompt ??
        PR_FIX_PROMPTS[item.ruleId]?.(item.filePath, item.lineStart) ??
        null,
    }));
    const { error: saveError } = await replacePrReviewFindings(reviewId, rows);
    if (saveError)
      throw new Error(`PR 리뷰 결과 저장 실패: ${saveError.message}`);

    const shown = rows.filter((r) => r.ai_verdict !== "false_positive");
    const counts: Partial<Record<Severity, number>> = {};
    for (const r of shown)
      counts[r.severity as Severity] =
        (counts[r.severity as Severity] ?? 0) + 1;
    const conclusion = conclusionOf(counts);

    // 5. GitHub 에 게시: 줄 코멘트는 이 PR 에서 추가된 줄에만 달 수 있다.
    const addedLines = new Map(
      files.map((f) => [
        f.path,
        new Set(parsePatch(f.patch).added.map((a) => a.line)),
      ]),
    );
    const inline = shown
      .filter((r) => addedLines.get(r.file_path)?.has(r.line))
      .slice(0, MAX_COMMENTS);
    const body = [
      `### ${CHECK_NAME}`,
      summaryMarkdown(shown as Parameters<typeof summaryMarkdown>[0]),
      shown.length > inline.length
        ? `\n줄 코멘트로 달지 못한 항목 ${shown.length - inline.length}개는 위 목록과 레고 화면에서 볼 수 있습니다.`
        : "",
    ].join("\n\n");

    let postedReview = false;
    if (shown.length > 0) {
      try {
        await createPullReview(installationId, repo, review.pr_number, {
          commitId: review.head_sha,
          body,
          comments: inline.map((r) => ({
            path: r.file_path,
            line: r.line,
            body: [
              `**${r.severity}** \`${r.rule_id}\` ${r.rule_title}`,
              r.explanation ?? r.reason,
              r.fix_prompt
                ? `<details><summary>AI 코딩 도구에 붙여넣을 수정 프롬프트</summary>\n\n\`\`\`\n${r.fix_prompt}\n\`\`\`\n</details>`
                : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          })),
        });
        postedReview = true;
      } catch (e) {
        notes.push(githubErrorNote(e, "리뷰 코멘트"));
      }
    }
    let postedCheck = false;
    if (checkRunId !== null) {
      try {
        await completeCheckRun(installationId, repo, checkRunId, {
          conclusion,
          title: shown.length === 0 ? "문제 없음" : `문제 ${shown.length}개`,
          summary: summaryMarkdown(
            shown as Parameters<typeof summaryMarkdown>[0],
          ),
          detailsUrl: detailsUrl(project.id, reviewId),
          annotations: shown.map((r) => ({
            path: r.file_path,
            start_line: r.line,
            end_line: r.line,
            annotation_level: LEVEL[r.severity as Severity],
            title: `${r.rule_id} ${r.rule_title}`,
            message: r.explanation ?? r.reason,
          })),
        });
        postedCheck = true;
      } catch (e) {
        notes.push(githubErrorNote(e, "상태 체크"));
      }
    }

    const summary: PrReviewSummary = {
      files: files.length,
      counts,
      conclusion,
      llm,
      note: notes.length > 0 ? notes.join(" ") : null,
      posted: { review: postedReview, check: postedCheck },
    };
    await updatePrReview(reviewId, { status: "done", summary });
  } catch (e) {
    reportError(e, { area: "pr-guard", extra: { reviewId } });
    await updatePrReview(reviewId, {
      status: "failed",
      error: notes.concat(githubErrorNote(e, "PR 읽기")).join(" "),
    });
    if (checkRunId !== null) {
      await completeCheckRun(installationId, repo, checkRunId, {
        conclusion: "neutral",
        title: "점검하지 못함",
        summary: "PR 을 읽는 중 오류가 나서 점검하지 못했습니다.",
        annotations: [],
      }).catch(() => {});
    }
  }
}
