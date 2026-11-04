import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";
import type { FindingStatus } from "./schemas";

// 사용자 화면의 읽기·상태 변경은 세션(RLS), 워커의 쓰기는 secret 키.

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select(
      "id, user_id, installation_id, repo_full_name, default_branch, pr_guard_enabled, pr_guard_strictness",
    )
    .eq("id", projectId)
    .maybeSingle();
}

export async function findActiveScan(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function consumeScanQuota(userId: string) {
  return createAdminClient().rpc("consume_scan_quota", { p_user_id: userId });
}

export async function addTokenUsage(userId: string, tokens: number) {
  return createAdminClient().rpc("add_token_usage", {
    p_user_id: userId,
    p_tokens: tokens,
  });
}

export async function insertScan(row: {
  projectId: string;
  userId: string;
  commitSha: string;
}) {
  return createAdminClient()
    .from("scans")
    .insert({
      project_id: row.projectId,
      user_id: row.userId,
      commit_sha: row.commitSha,
    })
    .select("id")
    .single();
}

export async function enqueueScan(scanId: string) {
  return createAdminClient().rpc("enqueue_scan", { p_scan_id: scanId });
}

export async function readScanJobs(qty: number, visibilitySeconds: number) {
  return createAdminClient().rpc("read_scan_jobs", {
    p_qty: qty,
    p_visibility_seconds: visibilitySeconds,
  });
}

export async function ackScanJob(msgId: number) {
  return createAdminClient().rpc("ack_scan_job", { p_msg_id: msgId });
}

export async function archiveScanJob(msgId: number) {
  return createAdminClient().rpc("archive_scan_job", { p_msg_id: msgId });
}

export async function getScanForWorker(scanId: string) {
  return createAdminClient()
    .from("scans")
    .select(
      "id, user_id, status, commit_sha, projects(installation_id, repo_full_name, detected_stack)",
    )
    .eq("id", scanId)
    .maybeSingle();
}

export async function updateScan(scanId: string, patch: Update<"scans">) {
  return createAdminClient().from("scans").update(patch).eq("id", scanId);
}

/** 재시도해도 결과가 겹치지 않도록 스캔의 발견 항목을 통째로 바꾼다. */
export async function replaceFindings(
  scanId: string,
  rows: Insert<"findings">[],
) {
  const admin = createAdminClient();
  const { error } = await admin.from("findings").delete().eq("scan_id", scanId);
  if (error || rows.length === 0) return { error };
  return admin.from("findings").insert(rows);
}

export async function insertLlmCall(row: Insert<"llm_calls">) {
  return createAdminClient().from("llm_calls").insert(row);
}

export async function listProjectScans(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select(
      "id, project_id, status, progress, commit_sha, summary, error, created_at, finished_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function getMyScan(scanId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select(
      "id, project_id, status, progress, commit_sha, summary, error, created_at, finished_at",
    )
    .eq("id", scanId)
    .maybeSingle();
}

export async function listScanFindings(scanId: string) {
  const supabase = await createClient();
  return supabase
    .from("findings")
    .select(
      "id, rule_id, severity, file_path, line_start, line_end, snippet, ai_verdict, explanation, fix_prompt, status, rules(title)",
    )
    .eq("scan_id", scanId)
    .order("line_start");
}

export async function setFindingStatus(
  findingId: string,
  status: FindingStatus,
) {
  const supabase = await createClient();
  return supabase
    .from("findings")
    .update({ status })
    .eq("id", findingId)
    .select("id, status")
    .maybeSingle();
}

/** 직전 완료 스캔에서 사용자가 무시한 항목의 fingerprint. 새 스캔에 이어 준다. */
export async function listIgnoredFingerprintsBefore(scanId: string) {
  const admin = createAdminClient();
  const { data: previousId, error } = await admin.rpc("previous_scan_id", {
    p_scan_id: scanId,
  });
  if (error || !previousId) return { data: [] as string[], error };
  const result = await admin
    .from("findings")
    .select("fingerprint")
    .eq("scan_id", previousId)
    .eq("status", "ignored");
  return {
    data: (result.data ?? []).map((r) => r.fingerprint),
    error: result.error,
  };
}

export async function getPreviousScanId(scanId: string) {
  const supabase = await createClient();
  return supabase.rpc("previous_scan_id", { p_scan_id: scanId });
}

export async function getScanDiffRows(scanId: string) {
  const supabase = await createClient();
  return supabase.rpc("scan_diff", { p_scan_id: scanId });
}

// PR 가드 ---------------------------------------------------------------------

export async function setPrGuard(projectId: string, enabled: boolean) {
  return createAdminClient()
    .from("projects")
    .update({ pr_guard_enabled: enabled })
    .eq("id", projectId);
}

export async function setPrGuardStrictness(
  projectId: string,
  strictness: string,
) {
  return createAdminClient()
    .from("projects")
    .update({ pr_guard_strictness: strictness })
    .eq("id", projectId);
}

/** webhook 의 설치·리포로 PR 가드를 켠 프로젝트를 찾는다(사용자마다 하나씩 있을 수 있다). */
export async function listGuardedProjects(
  installationId: number,
  repoFullName: string,
) {
  return createAdminClient()
    .from("projects")
    .select("id, user_id, installation_id, repo_full_name, detected_stack")
    .eq("installation_id", installationId)
    .eq("repo_full_name", repoFullName)
    .eq("pr_guard_enabled", true);
}

/** 같은 커밋의 리뷰가 이미 있으면(재전송) 만들지 않고 null 을 돌려준다. */
export async function insertPrReview(row: Insert<"pr_reviews">) {
  return createAdminClient()
    .from("pr_reviews")
    .upsert(row, {
      onConflict: "project_id,pr_number,head_sha",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();
}

export async function getPrReviewForWorker(reviewId: string) {
  return createAdminClient()
    .from("pr_reviews")
    .select(
      "id, user_id, pr_number, pr_title, head_sha, status, projects(id, installation_id, repo_full_name, detected_stack, pr_guard_strictness)",
    )
    .eq("id", reviewId)
    .maybeSingle();
}

export async function updatePrReview(
  reviewId: string,
  patch: Update<"pr_reviews">,
) {
  return createAdminClient()
    .from("pr_reviews")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", reviewId);
}

export async function replacePrReviewFindings(
  reviewId: string,
  rows: Insert<"pr_review_findings">[],
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("pr_review_findings")
    .delete()
    .eq("review_id", reviewId);
  if (error || rows.length === 0) return { data: [], error };
  return admin
    .from("pr_review_findings")
    .insert(rows)
    .select("id, fingerprint, file_path, line");
}

const PR_FINDING_COLUMNS =
  "id, fingerprint, rule_id, rule_title, severity, file_path, line, reason, ai_verdict, explanation, fix_prompt, github_comment_id, state, ignore_reason, ignored_by";

/** 같은 PR 의 직전(끝난) 리뷰와 그 발견 항목. 커밋 사이 비교에 쓴다. */
export async function getPreviousPrReview(
  projectId: string,
  prNumber: number,
  reviewId: string,
) {
  const admin = createAdminClient();
  const { data: previous } = await admin
    .from("pr_reviews")
    .select("id")
    .eq("project_id", projectId)
    .eq("pr_number", prNumber)
    .eq("status", "done")
    .neq("id", reviewId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!previous) return { review: null, findings: [] };
  const { data: findings } = await admin
    .from("pr_review_findings")
    .select(PR_FINDING_COLUMNS)
    .eq("review_id", previous.id);
  // fingerprint 가 없는 예전 리뷰는 비교할 수 없으니 없던 것으로 본다(남은 문제가 해결로 잡히지 않게).
  if (findings?.some((f) => !f.fingerprint))
    return { review: null, findings: [] };
  return { review: previous, findings: findings ?? [] };
}

export async function listPrReviewFindingsForWorker(reviewId: string) {
  return createAdminClient()
    .from("pr_review_findings")
    .select(PR_FINDING_COLUMNS)
    .eq("review_id", reviewId);
}

export async function setPrFindingCommentIds(
  rows: { id: string; commentId: number }[],
) {
  const admin = createAdminClient();
  for (const row of rows) {
    const { error } = await admin
      .from("pr_review_findings")
      .update({ github_comment_id: row.commentId })
      .eq("id", row.id);
    if (error) return { error };
  }
  return { error: null };
}

/** /lego ignore: 답글이 달린 줄 코멘트의 발견 항목과 그 PR 정보 */
export async function findPrFindingByComment(commentId: number) {
  return createAdminClient()
    .from("pr_review_findings")
    .select(
      "id, fingerprint, rule_id, pr_reviews!inner(project_id, pr_number, projects!inner(installation_id, repo_full_name))",
    )
    .eq("github_comment_id", commentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function getLatestPrReview(projectId: string, prNumber: number) {
  return createAdminClient()
    .from("pr_reviews")
    .select("id, head_sha, check_run_id, summary, projects(id)")
    .eq("project_id", projectId)
    .eq("pr_number", prNumber)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function ignorePrFindings(
  reviewIds: string[],
  fingerprint: string,
  reason: string,
  by: string,
) {
  return createAdminClient()
    .from("pr_review_findings")
    .update({ state: "ignored", ignore_reason: reason, ignored_by: by })
    .in("review_id", reviewIds)
    .eq("fingerprint", fingerprint);
}

/** 작업 키(T-3)로 이 리포에 연결된 스펙의 작업을 찾는다. 같은 키가 여러 스펙에 있으면 최근 스펙 것. */
export async function listTasksByKeys(
  installationId: number,
  repoFullName: string,
  keys: string[],
) {
  return createAdminClient()
    .from("spec_tasks")
    .select(
      "key, title, description, acceptance_criteria, specs!inner(created_at, projects!inner(installation_id, repo_full_name))",
    )
    .in("key", keys.length > 0 ? keys : ["__none__"])
    .eq("specs.projects.installation_id", installationId)
    .eq("specs.projects.repo_full_name", repoFullName)
    .order("created_at", { referencedTable: "specs", ascending: false });
}

export async function listProjectPrReviews(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("pr_reviews")
    .select("id, pr_number, pr_title, pr_url, status, summary, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function getMyPrReview(reviewId: string) {
  const supabase = await createClient();
  return supabase
    .from("pr_reviews")
    .select(
      "id, project_id, pr_number, pr_title, pr_url, head_sha, status, summary, error, created_at, projects(repo_full_name)",
    )
    .eq("id", reviewId)
    .maybeSingle();
}

export async function listPrReviewFindings(reviewId: string) {
  const supabase = await createClient();
  return supabase
    .from("pr_review_findings")
    .select(
      "id, rule_id, rule_title, severity, file_path, line, snippet, reason, ai_verdict, explanation, fix_prompt, state, ignore_reason, ignored_by",
    )
    .eq("review_id", reviewId)
    .order("created_at");
}

/** PR 가드 메뉴: 내 프로젝트의 가드 상태 */
export async function listMyGuardProjects() {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select(
      "id, repo_full_name, installation_id, pr_guard_enabled, pr_guard_strictness",
    )
    .order("created_at", { ascending: false });
}

/** PR 가드 메뉴: 모든 프로젝트의 최근 PR 리뷰 */
export async function listMyRecentPrReviews() {
  const supabase = await createClient();
  return supabase
    .from("pr_reviews")
    .select(
      "id, project_id, pr_number, pr_title, pr_url, status, summary, created_at, projects(repo_full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(30);
}
