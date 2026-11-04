import "server-only";
import {
  codeContext,
  fingerprint,
  maskSecrets,
  parsePatch,
  PR_RULES,
  reviewPullRequest,
  riskAreas,
  STATIC_RULES,
  type Candidate,
  type ChangedFile,
} from "@lego/scanner";
import {
  completeCheckRun,
  createCheckRun,
  createPullReview,
  listPullCommitMessages,
  listPullFiles,
  listReviewComments,
  readFileAtRef,
  replyToReviewComment,
  resolveThreads,
} from "@/lib/github/pulls";
import { isLlmConfigured, type LlmUsage } from "@/lib/llm";
import { reportError } from "@/lib/monitoring";
import type { Insert } from "@/lib/supabase/types";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  addTokenUsage,
  getPreviousPrReview,
  getPrReviewForWorker,
  insertLlmCall,
  insertPrReview,
  listGuardedProjects,
  replacePrReviewFindings,
  setPrFindingCommentIds,
  updatePrReview,
} from "../repository";
import {
  pullRequestEvent,
  strictnessSchema,
  type AiVerdict,
  type PrFindingRef,
  type PrReviewSummary,
  type PrScope,
  type Severity,
} from "../schemas";
import { explain, triage, type JudgeItem } from "./judge";
import { PR_FIX_PROMPTS } from "./pr-guard-prompts";
import {
  CHECK_NAME,
  checkOutput,
  commentBody,
  countBySeverity,
  detailsUrl,
  githubErrorNote,
  reviewBody,
  shouldComment,
  type PublishedFinding,
} from "./pr-guard-publish";
import { checkSpecScope } from "./pr-guard-scope";

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

type Repo = { installationId: number; repo: string; headSha: string };

/** 바뀐 파일(최신 내용 포함)과 .env.example 같은 템플릿 */
async function readPullRequest(r: Repo, prNumber: number) {
  const pullFiles = await listPullFiles(r.installationId, r.repo, prNumber);
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
        (await readFileAtRef(r.installationId, r.repo, f.path, r.headSha)) ??
        undefined;
    }
    files.push({ path: f.path, status, patch: f.patch, content });
  }
  const templates: string[] = [];
  for (const name of ENV_TEMPLATES) {
    const text = await readFileAtRef(r.installationId, r.repo, name, r.headSha);
    if (text !== null) templates.push(text);
  }
  return { files, templates };
}

type Item = JudgeItem & { candidate: Candidate; fingerprint: string };
type Judged = {
  verdict: AiVerdict | null;
  explanation: string | null;
  fixPrompt: string | null;
};

/**
 * 보안 규칙 후보만 AI 판별·설명. 직전 커밋에서 이미 판별한 같은 문제(fingerprint)는 그 결과를 다시 쓴다.
 * PR 규칙은 diff 로 확정되므로 고정 안내를 쓴다.
 */
async function judgeItems(
  items: Item[],
  previous: Map<string, Judged>,
  stack: string,
  onUsage: (purpose: "triage" | "explain", usage: LlmUsage) => Promise<boolean>,
) {
  const results = new Map<number, Judged>();
  const fresh: Item[] = [];
  for (const item of items) {
    const before = previous.get(item.fingerprint);
    if (before?.verdict) results.set(item.id, before);
    else if (item.ruleId.startsWith("SEC-")) fresh.push(item);
  }
  let llm: PrReviewSummary["llm"] = fresh.length === 0 ? undefined : "done";
  if (fresh.length > 0 && !isLlmConfigured()) llm = "skipped";
  else if (fresh.length > 0) {
    const noop = async () => {};
    const triaged = await triage(fresh, stack, onUsage, noop);
    const confirmed = fresh.filter(
      (i) => triaged.verdicts.get(i.id)?.verdict !== "false_positive",
    );
    let texts = new Map<number, { explanation: string; fixPrompt: string }>();
    if (triaged.stopped) llm = "partial";
    else if (confirmed.length > 0) {
      const explained = await explain(confirmed, stack, onUsage, noop);
      texts = explained.results;
      if (explained.stopped || texts.size < confirmed.length) llm = "partial";
    }
    for (const item of fresh)
      results.set(item.id, {
        verdict: triaged.verdicts.get(item.id)?.verdict ?? null,
        explanation: texts.get(item.id)?.explanation ?? null,
        fixPrompt: texts.get(item.id)?.fixPrompt ?? null,
      });
  }
  return { results, llm };
}

/**
 * 리뷰 하나를 끝까지 처리한다.
 * 1. 바뀐 파일 → 규칙 → AI 판별(새 문제만) → 저장
 * 2. 직전 커밋과 비교: 이미 코멘트한 문제는 다시 달지 않고, 사라진 문제는 '해결됨' 답글 + 대화 접기
 * 3. 무시(/lego ignore)한 문제는 이어서 무시, 상태 체크는 남은 문제로만 결정
 * GitHub 게시가 실패해도 결과는 레고 화면에 남는다.
 */
export async function processPrReview(reviewId: string) {
  const { data: review, error } = await getPrReviewForWorker(reviewId);
  if (error) throw new Error(`PR 리뷰 조회 실패: ${error.message}`);
  const project = review?.projects;
  if (!review || !project?.installation_id || review.status === "done") return;
  const r: Repo = {
    installationId: project.installation_id,
    repo: project.repo_full_name,
    headSha: review.head_sha,
  };
  const strictness = strictnessSchema
    .catch("normal")
    .parse(project.pr_guard_strictness);
  await updatePrReview(reviewId, { status: "running", error: null });

  const notes: string[] = [];
  let checkRunId: number | null = null;
  try {
    checkRunId = await createCheckRun(
      r.installationId,
      r.repo,
      r.headSha,
      CHECK_NAME,
    );
    await updatePrReview(reviewId, { check_run_id: checkRunId });
  } catch (e) {
    notes.push(githubErrorNote(e, "상태 체크"));
  }

  try {
    const { files, templates } = await readPullRequest(r, review.pr_number);
    const { candidates, errors } = reviewPullRequest(
      files,
      templates.length > 0 ? templates : null,
    );
    for (const e of errors)
      reportError(new Error(e.message), {
        area: "pr-guard.rule",
        extra: { reviewId, rule: e.ruleId },
      });

    // 같은 문제가 여러 번 잡히면(같은 줄) 하나만 남긴다.
    const contents = new Map(
      files
        .filter((f) => f.content !== undefined)
        .map((f) => [f.path, { path: f.path, content: f.content! }]),
    );
    const byFp = new Map<string, Candidate>();
    for (const c of candidates) {
      const fp = fingerprint(c);
      if (!byFp.has(fp)) byFp.set(fp, c);
    }
    const items: Item[] = [...byFp].map(([fp, c], id) => ({
      id,
      fingerprint: fp,
      candidate: c,
      ruleId: c.ruleId,
      ruleTitle: RULE_TITLES.get(c.ruleId) ?? c.ruleId,
      filePath: c.filePath,
      lineStart: c.lineStart,
      lineEnd: c.lineEnd,
      reason: c.reason,
      context: codeContext(contents.get(c.filePath), c),
    }));

    const prev = await getPreviousPrReview(
      project.id,
      review.pr_number,
      reviewId,
    );
    const prevByFp = new Map(prev.findings.map((f) => [f.fingerprint, f]));

    const onUsage = async (purpose: string, usage: LlmUsage) => {
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
    const { results, llm } = await judgeItems(
      items,
      new Map(
        prev.findings.map((f) => [
          f.fingerprint,
          {
            verdict: f.ai_verdict as AiVerdict | null,
            explanation: f.explanation,
            fixPrompt: f.fix_prompt,
          },
        ]),
      ),
      stackLabel(project.detected_stack),
      onUsage,
    );

    // 위험 영역 + 스펙 작업 범위(첫 리뷰에서만 AI 를 쓴다)
    const risk = riskAreas(files);
    let scope: PrScope | null = null;
    if (!prev.review) {
      try {
        const commits = await listPullCommitMessages(
          r.installationId,
          r.repo,
          review.pr_number,
        );
        scope = await checkSpecScope({
          installationId: r.installationId,
          repoFullName: r.repo,
          texts: [review.pr_title, ...commits],
          files: files.map((f) => f.path),
          onUsage: async (usage) => {
            await onUsage("scope", usage);
          },
        });
      } catch (e) {
        reportError(e, { area: "pr-guard.scope", extra: { reviewId } });
      }
    }

    // 저장: 직전 커밋의 코멘트 id·무시 상태를 이어받는다.
    const rows: Insert<"pr_review_findings">[] = items.map((item) => {
      const before = prevByFp.get(item.fingerprint);
      const judged = results.get(item.id);
      return {
        review_id: reviewId,
        user_id: review.user_id,
        fingerprint: item.fingerprint,
        rule_id: item.ruleId,
        rule_title: item.ruleTitle,
        severity: item.candidate.severity,
        file_path: item.filePath,
        line: Math.max(1, item.lineStart),
        snippet: maskSecrets(
          item.candidate.snippet.split("\n").slice(0, 6).join("\n"),
        ),
        reason: item.reason,
        ai_verdict: judged?.verdict ?? null,
        explanation: judged?.explanation ?? null,
        fix_prompt:
          judged?.fixPrompt ??
          PR_FIX_PROMPTS[item.ruleId]?.(item.filePath, item.lineStart) ??
          null,
        github_comment_id: before?.github_comment_id ?? null,
        state: before?.state === "ignored" ? "ignored" : "open",
        ignore_reason: before?.ignore_reason ?? null,
        ignored_by: before?.ignored_by ?? null,
      };
    });
    const { data: saved, error: saveError } = await replacePrReviewFindings(
      reviewId,
      rows,
    );
    if (saveError)
      throw new Error(`PR 리뷰 결과 저장 실패: ${saveError.message}`);
    const idByFp = new Map((saved ?? []).map((s) => [s.fingerprint, s.id]));

    const shown = rows.filter(
      (x) => x.ai_verdict !== "false_positive",
    ) as (PublishedFinding & {
      fingerprint: string;
      github_comment_id: number | null;
    })[];
    const open = shown.filter((x) => x.state === "open");
    const added = open.filter((x) => !prevByFp.has(x.fingerprint));
    const current = new Set(rows.map((x) => x.fingerprint));
    const gone = prev.findings.filter(
      (f) =>
        f.ai_verdict !== "false_positive" &&
        f.state === "open" &&
        !current.has(f.fingerprint),
    );
    const resolved: PrFindingRef[] = gone.map((f) => ({
      ruleId: f.rule_id,
      ruleTitle: f.rule_title,
      filePath: f.file_path,
      line: f.line,
    }));

    // GitHub: 새 문제만 줄 코멘트(추가된 줄에만 달 수 있다)
    const addedLines = new Map(
      files.map((f) => [
        f.path,
        new Set(parsePatch(f.patch).added.map((a) => a.line)),
      ]),
    );
    const inline = added
      .filter((x) => shouldComment(x.severity, strictness))
      .filter((x) => addedLines.get(x.file_path)?.has(x.line))
      .slice(0, MAX_COMMENTS);
    const isFirst = !prev.review;
    let postedReview = false;
    if (
      added.length > 0 ||
      resolved.length > 0 ||
      (isFirst && risk.length > 0)
    ) {
      try {
        const githubReviewId = await createPullReview(
          r.installationId,
          r.repo,
          review.pr_number,
          {
            commitId: r.headSha,
            body: reviewBody({
              isFirst,
              added,
              inlineCount: inline.length,
              resolved,
              risk,
              scope,
            }),
            comments: inline.map((x) => ({
              path: x.file_path,
              line: x.line,
              body: commentBody(x),
            })),
          },
        );
        postedReview = true;
        if (inline.length > 0) {
          const comments = await listReviewComments(
            r.installationId,
            r.repo,
            review.pr_number,
            githubReviewId,
          );
          const updates = inline.flatMap((x) => {
            const c = comments.find(
              (c) => c.path === x.file_path && c.line === x.line,
            );
            const id = idByFp.get(x.fingerprint);
            return c && id ? [{ id, commentId: c.id }] : [];
          });
          await setPrFindingCommentIds(updates);
        }
      } catch (e) {
        notes.push(githubErrorNote(e, "리뷰 코멘트"));
      }
    }

    // 사라진 문제: 그 코멘트에 '해결됨' 답글을 달고 대화를 접는다.
    const goneComments = gone.flatMap((f) =>
      f.github_comment_id ? [Number(f.github_comment_id)] : [],
    );
    if (goneComments.length > 0) {
      try {
        for (const id of goneComments)
          await replyToReviewComment(
            r.installationId,
            r.repo,
            review.pr_number,
            id,
            `✅ 커밋 ${r.headSha.slice(0, 7)} 에서 해결됐어요.`,
          );
        await resolveThreads(
          r.installationId,
          r.repo,
          review.pr_number,
          goneComments,
        );
      } catch (e) {
        notes.push(githubErrorNote(e, "해결 표시"));
      }
    }

    const output = checkOutput({
      findings: shown,
      resolved,
      risk,
      scope,
      strictness,
    });
    let postedCheck = false;
    if (checkRunId !== null) {
      try {
        await completeCheckRun(r.installationId, r.repo, checkRunId, {
          ...output,
          detailsUrl: detailsUrl(project.id, reviewId),
        });
        postedCheck = true;
      } catch (e) {
        notes.push(githubErrorNote(e, "상태 체크"));
      }
    }

    const summary: PrReviewSummary = {
      files: files.length,
      counts: countBySeverity(open as { severity: Severity }[]),
      conclusion: output.conclusion,
      llm,
      note: notes.length > 0 ? notes.join(" ") : null,
      posted: { review: postedReview, check: postedCheck },
      newCount: added.length,
      ignored: shown.length - open.length,
      resolved,
      risk,
      scope,
      strictness,
    };
    await updatePrReview(reviewId, { status: "done", summary });
  } catch (e) {
    reportError(e, { area: "pr-guard", extra: { reviewId } });
    await updatePrReview(reviewId, {
      status: "failed",
      error: notes.concat(githubErrorNote(e, "PR 읽기")).join(" "),
    });
    if (checkRunId !== null) {
      await completeCheckRun(r.installationId, r.repo, checkRunId, {
        conclusion: "neutral",
        title: "점검하지 못함",
        summary: "PR 을 읽는 중 오류가 나서 점검하지 못했습니다.",
        annotations: [],
      }).catch(() => {});
    }
  }
}
