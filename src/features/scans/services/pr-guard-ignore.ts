import "server-only";
import { completeCheckRun, replyToReviewComment } from "@/lib/github/pulls";
import { reportError } from "@/lib/monitoring";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  findPrFindingByComment,
  getLatestPrReview,
  ignorePrFindings,
  listPrReviewFindingsForWorker,
  updatePrReview,
  setTaskPrCheck,
} from "../repository";
import {
  prReviewSummarySchema,
  reviewCommentEvent,
  type PrReviewSummary,
  type Severity,
} from "../schemas";
import {
  checkOutput,
  countBySeverity,
  detailsUrl,
  type PublishedFinding,
} from "./pr-guard-publish";

const IGNORE = /^\s*\/lego\s+ignore\b\s*([\s\S]*)$/i;
// 리포에 쓰기 권한이 있는 사람만 무시할 수 있다.
const TRUSTED = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

/**
 * pull_request_review_comment: 레고 줄 코멘트에 `/lego ignore 이유` 로 답글을 달면
 * 그 문제를 이 PR 에서 무시하고(다음 커밋에도 이어짐) 상태 체크를 다시 계산한다.
 */
export async function handleReviewCommentEvent(
  payload: unknown,
): Promise<Result<{ handled: boolean }>> {
  const parsed = reviewCommentEvent.safeParse(payload);
  if (!parsed.success)
    return err(
      "invalid_payload",
      "pull_request_review_comment 이벤트 형식이 다릅니다.",
    );
  const { action, comment, installation, repository, pull_request } =
    parsed.data;
  const command = comment.body.match(IGNORE);
  if (
    action !== "created" ||
    !command ||
    !comment.in_reply_to_id ||
    !installation ||
    comment.user.type === "Bot"
  )
    return ok({ handled: false });

  const { data: finding } = await findPrFindingByComment(
    comment.in_reply_to_id,
  );
  const review = finding?.pr_reviews;
  const project = review?.projects;
  // URL·본문으로 들어온 값을 믿지 않는다: 코멘트가 이 설치·리포·PR 의 것인지 확인한다.
  if (
    !finding ||
    !review ||
    !project ||
    project.installation_id !== installation.id ||
    project.repo_full_name !== repository.full_name ||
    review.pr_number !== pull_request.number
  )
    return ok({ handled: false });

  const reply = (body: string) =>
    replyToReviewComment(
      installation.id,
      repository.full_name,
      pull_request.number,
      comment.in_reply_to_id!,
      body,
    ).catch((e) => reportError(e, { area: "pr-guard.ignore.reply" }));

  if (!TRUSTED.has(comment.author_association)) {
    await reply(
      "리포에 쓰기 권한이 있는 사람만 `/lego ignore` 를 쓸 수 있어요.",
    );
    return ok({ handled: true });
  }
  const reason = command[1]!.trim().slice(0, 300) || "이유 없음";

  const { data: latest } = await getLatestPrReview(
    review.project_id,
    review.pr_number,
  );
  const reviewIds = [
    ...new Set([latest?.id].filter((id): id is string => !!id)),
  ];
  const { error } = await ignorePrFindings(
    reviewIds,
    finding.fingerprint,
    reason,
    comment.user.login,
  );
  if (error) return err("db_error", error.message);

  // 최신 리뷰의 체크를 다시 계산한다(무시한 항목은 결론에서 빠진다).
  if (latest) {
    const { data: rows } = await listPrReviewFindingsForWorker(latest.id);
    const summary = prReviewSummarySchema.parse(latest.summary ?? {});
    const findings = (rows ?? []).filter(
      (r) => r.ai_verdict !== "false_positive",
    ) as PublishedFinding[];
    const output = checkOutput({
      findings,
      resolved: summary.resolved,
      risk: summary.risk,
      scope: summary.scope,
      strictness: summary.strictness,
    });
    const open = findings.filter((f) => f.state === "open");
    const next: PrReviewSummary = {
      ...summary,
      counts: countBySeverity(open as { severity: Severity }[]),
      conclusion: output.conclusion,
      ignored: findings.length - open.length,
    };
    await updatePrReview(latest.id, { summary: next });
    await setTaskPrCheck(
      repository.full_name,
      pull_request.number,
      output.conclusion,
    );
    if (latest.check_run_id)
      await completeCheckRun(
        installation.id,
        repository.full_name,
        Number(latest.check_run_id),
        {
          ...output,
          detailsUrl: detailsUrl(review.project_id, latest.id),
        },
      ).catch((e) => reportError(e, { area: "pr-guard.ignore.check" }));
  }
  await reply(
    `🙈 @${comment.user.login} 님 요청으로 무시했어요: ${reason}\n\n이 PR 에서는 다음 커밋에도 \`${finding.rule_id}\` 를 체크에서 뺍니다.`,
  );
  return ok({ handled: true });
}
