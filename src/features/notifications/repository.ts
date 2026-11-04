import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";

// 화면은 사용자 세션(RLS, webhook_url 열은 못 읽음), 연결 저장·알림 보내기는 secret 키.

const VIEW_COLUMNS =
  "project_id, team_name, channel_name, notify_live, notify_guard, notify_scan, last_error, created_at";

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
      "project_id, user_id, webhook_url, notify_live, notify_guard, notify_scan, projects(repo_full_name)",
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
