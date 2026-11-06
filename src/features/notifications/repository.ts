import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";

// 화면은 사용자 세션(RLS, webhook_url 열은 못 읽음), 연결 저장·알림 보내기는 secret 키.

const VIEW_COLUMNS =
  "project_id, team_name, channel_name, notify_live, notify_guard, notify_scan, notify_weekly, last_error, created_at";

export async function getMySlackConnection(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("slack_connections")
    .select(VIEW_COLUMNS)
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function upsertSlackConnection(row: Insert<"slack_connections">) {
  return createAdminClient()
    .from("slack_connections")
    .upsert(row, { onConflict: "project_id" });
}

export async function updateSlackConnection(
  projectId: string,
  userId: string,
  patch: Update<"slack_connections">,
) {
  return createAdminClient()
    .from("slack_connections")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .select("project_id")
    .maybeSingle();
}

export async function deleteSlackConnection(projectId: string, userId: string) {
  return createAdminClient()
    .from("slack_connections")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
}

/** 알림 보내기: webhook 주소까지 읽는다(서버 전용). */
export async function getSlackConnectionForWorker(projectId: string) {
  return createAdminClient()
    .from("slack_connections")
    .select(
      "project_id, user_id, webhook_url, notify_live, notify_guard, notify_scan, notify_weekly, projects(repo_full_name)",
    )
    .eq("project_id", projectId)
    .maybeSingle();
}

export async function setSlackError(projectId: string, error: string | null) {
  return createAdminClient()
    .from("slack_connections")
    .update({ last_error: error, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
}

// 주간 요약 ---------------------------------------------------------------------

export async function listDueWeeklyDigests(limit: number, weekStart: string) {
  return createAdminClient()
    .from("slack_connections")
    .select("project_id")
    .eq("notify_weekly", true)
    .lt("last_weekly_at", weekStart)
    .limit(limit);
}

/** 이번 주 몫을 먼저 차지한다. 워커가 겹쳐 돌아도 한 번만 보낸다. */
export async function claimWeeklyDigest(projectId: string, weekStart: string) {
  return createAdminClient()
    .from("slack_connections")
    .update({ last_weekly_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .lt("last_weekly_at", weekStart)
    .select("project_id")
    .maybeSingle();
}

export async function listWeeklyScans(projectId: string) {
  return createAdminClient()
    .from("scans")
    .select("id, created_at")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(30);
}

export async function listWeeklyFindings(scanIds: string[]) {
  return createAdminClient()
    .from("findings")
    .select("scan_id, fingerprint, severity, ai_verdict, status")
    .in("scan_id", scanIds)
    .limit(10_000);
}

export async function listWeeklyPrReviews(projectId: string, since: string) {
  return createAdminClient()
    .from("pr_reviews")
    .select("pr_number, summary")
    .eq("project_id", projectId)
    .eq("status", "done")
    .gte("created_at", since)
    .order("created_at");
}

export async function listWeeklyLiveChecks(projectId: string, since: string) {
  return createAdminClient()
    .from("live_checks")
    .select("results, live_targets!inner(project_id)")
    .eq("live_targets.project_id", projectId)
    .eq("status", "done")
    .gte("created_at", since)
    .order("created_at");
}
