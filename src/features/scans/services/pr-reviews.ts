import "server-only";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  findMyProject,
  getMyPrReview,
  listPrReviewFindings,
  listMyGuardProjects,
  listMyRecentPrReviews,
  listProjectPrReviews,
  setPrGuard,
  setPrGuardStrictness,
} from "../repository";
import {
  prReviewSummarySchema,
  strictnessSchema,
  type Strictness,
  type AiVerdict,
  type PrFindingView,
  type PrReviewRow,
  type PrReviewStatus,
  type Severity,
} from "../schemas";

/** PR 가드 켜기/끄기. 본인 프로젝트이고 GitHub App 으로 연결한 리포여야 한다. */
export async function changePrGuard(
  projectId: string,
  enabled: boolean,
): Promise<Result<{ enabled: boolean }>> {
  const { data: project } = await findMyProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  if (!project.installation_id)
    return err(
      "not_supported",
      "주소로 등록한 공개 리포는 PR 가드를 쓸 수 없습니다. GitHub App 으로 연결해 주세요.",
    );
  const { error } = await setPrGuard(projectId, enabled);
  return error ? err("db_error", error.message) : ok({ enabled });
}

/** PR 가드 엄격도 바꾸기. 다음 PR 커밋부터 적용된다. */
export async function changePrGuardStrictness(
  projectId: string,
  strictness: Strictness,
): Promise<Result<{ strictness: Strictness }>> {
  const { data: project } = await findMyProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  if (!project.installation_id)
    return err(
      "not_supported",
      "주소로 등록한 공개 리포는 PR 가드를 쓸 수 없습니다. GitHub App 으로 연결해 주세요.",
    );
  const { error } = await setPrGuardStrictness(projectId, strictness);
  return error ? err("db_error", error.message) : ok({ strictness });
}

const readStrictness = (v: unknown) =>
  strictnessSchema.catch("normal").parse(v);

const toRow = (r: {
  id: string;
  pr_number: number;
  pr_title: string;
  pr_url: string | null;
  status: string;
  summary: unknown;
  created_at: string;
}): PrReviewRow => ({
  id: r.id,
  prNumber: r.pr_number,
  prTitle: r.pr_title,
  prUrl: r.pr_url,
  status: r.status as PrReviewStatus,
  summary: prReviewSummarySchema
    .catch(() => prReviewSummarySchema.parse({}))
    .parse(r.summary ?? {}),
  createdAt: r.created_at,
});

export async function getProjectPrReviews(projectId: string) {
  const { data } = await listProjectPrReviews(projectId);
  return (data ?? []).map(toRow);
}

export async function getPrReviewDetail(reviewId: string) {
  const { data: review } = await getMyPrReview(reviewId);
  if (!review) return null;
  const { data: findings } = await listPrReviewFindings(reviewId);
  const views: PrFindingView[] = (findings ?? []).map((f) => ({
    id: f.id,
    state: f.state === "ignored" ? "ignored" : "open",
    ignoreReason: f.ignore_reason,
    ignoredBy: f.ignored_by,
    ruleId: f.rule_id,
    ruleTitle: f.rule_title,
    severity: f.severity as Severity,
    filePath: f.file_path,
    line: f.line,
    snippet: f.snippet,
    reason: f.reason,
    aiVerdict: (f.ai_verdict as AiVerdict | null) ?? null,
    explanation: f.explanation,
    fixPrompt: f.fix_prompt,
  }));
  return {
    ...toRow(review),
    projectId: review.project_id,
    repoFullName: review.projects?.repo_full_name ?? "",
    headSha: review.head_sha,
    error: review.error,
    findings: views,
  };
}

/** 프로젝트 화면의 PR 가드 상태. App 설치 없이 주소로 등록한 리포는 쓸 수 없다. */
export async function getPrGuardState(projectId: string) {
  const { data: project } = await findMyProject(projectId);
  return {
    available: !!project?.installation_id,
    enabled: !!project?.pr_guard_enabled,
    strictness: readStrictness(project?.pr_guard_strictness),
  };
}

/** PR 가드 메뉴: 프로젝트별 상태와 모든 프로젝트의 최근 PR 리뷰 */
export async function getGuardOverview() {
  const [{ data: projects }, { data: reviews }] = await Promise.all([
    listMyGuardProjects(),
    listMyRecentPrReviews(),
  ]);
  return {
    projects: (projects ?? []).map((p) => ({
      id: p.id,
      repoFullName: p.repo_full_name,
      available: p.installation_id !== null,
      enabled: p.pr_guard_enabled,
      strictness: readStrictness(p.pr_guard_strictness),
    })),
    reviews: (reviews ?? []).map((r) => ({
      ...toRow(r),
      projectId: r.project_id,
      repoFullName: r.projects?.repo_full_name ?? "",
    })),
  };
}
