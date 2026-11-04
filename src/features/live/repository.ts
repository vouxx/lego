import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";

// 화면 읽기는 세션(RLS), 대상 만들기·점검 결과 쓰기는 소유자를 확인한 뒤 secret 키.

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, user_id, installation_id, repo_full_name, default_branch")
    .eq("id", projectId)
    .maybeSingle();
}

export async function getMyTarget(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("live_targets")
    .select("id, site_url, verify_token, verified_at, last_checked_at")
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function upsertTarget(row: Insert<"live_targets">) {
  return createAdminClient()
    .from("live_targets")
    .upsert(row, { onConflict: "project_id" })
    .select("id")
    .single();
}

export async function updateTarget(
  targetId: string,
  patch: Update<"live_targets">,
) {
  return createAdminClient()
    .from("live_targets")
    .update(patch)
    .eq("id", targetId);
}

export async function deleteTarget(targetId: string) {
  return createAdminClient().from("live_targets").delete().eq("id", targetId);
}

export async function getTargetForWorker(targetId: string) {
  return createAdminClient()
    .from("live_targets")
    .select(
      "id, user_id, site_url, verified_at, last_checked_at, projects(id, installation_id, repo_full_name, default_branch)",
    )
    .eq("id", targetId)
    .maybeSingle();
}

/** 하루가 지난 확인된 대상 */
export async function listDueTargets(limit: number) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  return createAdminClient()
    .from("live_targets")
    .select("id")
    .not("verified_at", "is", null)
    .or(`last_checked_at.is.null,last_checked_at.lt.${since}`)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
}

export async function insertCheck(row: Insert<"live_checks">) {
  return createAdminClient()
    .from("live_checks")
    .insert(row)
    .select("id")
    .single();
}

export async function updateCheck(
  checkId: string,
  patch: Update<"live_checks">,
) {
  return createAdminClient()
    .from("live_checks")
    .update(patch)
    .eq("id", checkId);
}

export async function getPreviousResults(
  targetId: string,
  beforeCheckId: string,
) {
  return createAdminClient()
    .from("live_checks")
    .select("results")
    .eq("target_id", targetId)
    .eq("status", "done")
    .neq("id", beforeCheckId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function listMyChecks(targetId: string) {
  const supabase = await createClient();
  return supabase
    .from("live_checks")
    .select(
      "id, trigger, status, results, summary, error, created_at, finished_at",
    )
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(10);
}

/** 코드와 운영 비교용: 가장 최근에 끝난 스캔의 커밋 */
export async function getLatestScanCommit(projectId: string) {
  return createAdminClient()
    .from("scans")
    .select("commit_sha")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}
