import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";

// 내 세션 읽기는 세션(RLS). 공개 세션·갤러리·Storage 는 서버가 조건을 확인한 뒤 secret 키로 읽는다.

export const SESSION_BUCKET = "lego-sessions";

const CARD_COLUMNS =
  "id, slug, title, tool, tags, goal, like_count, created_at, status, visibility";

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
}

export async function listMyProjects() {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, repo_full_name")
    .order("created_at", { ascending: false });
}

export async function insertSession(row: Insert<"sessions">) {
  return createAdminClient().from("sessions").insert(row).select("id").single();
}

export async function updateSession(
  sessionId: string,
  patch: Update<"sessions">,
) {
  return createAdminClient()
    .from("sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function deleteSessionRow(sessionId: string) {
  return createAdminClient().from("sessions").delete().eq("id", sessionId);
}

export async function getMySession(sessionId: string) {
  const supabase = await createClient();
  return supabase
    .from("sessions")
    .select(
      `${CARD_COLUMNS}, user_id, project_id, outcome, storage_path, stats, error, analysis_started_at, updated_at, session_insights(id, kind, content, prompt_text, turn_index, sort_order)`,
    )
    .eq("id", sessionId)
    .maybeSingle();
}

/** 분석 워커용(사용자 세션 없이). */
export async function getSessionForWorker(sessionId: string) {
  return createAdminClient()
    .from("sessions")
    .select("id, user_id, tool, title, storage_path, stats, status")
    .eq("id", sessionId)
    .maybeSingle();
}

export async function listMySessions() {
  const supabase = await createClient();
  return supabase
    .from("sessions")
    .select(CARD_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function getSharedSessionBySlug(slug: string) {
  return createAdminClient()
    .from("sessions")
    .select(
      `${CARD_COLUMNS}, user_id, outcome, storage_path, stats, hidden, profiles!sessions_user_id_fkey(github_login), session_insights(id, kind, content, prompt_text, turn_index, sort_order)`,
    )
    .eq("slug", slug)
    .in("visibility", ["public", "unlisted"])
    .eq("status", "done")
    .maybeSingle();
}

export async function searchPublicSessions(filter: {
  q: string | null;
  tag: string | null;
  tool: string | null;
  sort: "recent" | "likes";
}) {
  let query = createAdminClient()
    .from("sessions")
    .select(`${CARD_COLUMNS}, profiles!sessions_user_id_fkey(github_login)`)
    .eq("visibility", "public")
    .eq("status", "done")
    .eq("hidden", false);
  if (filter.q) {
    const q = filter.q.replace(/[%_,()]/g, " ").trim();
    if (q) query = query.or(`title.ilike.%${q}%,goal.ilike.%${q}%`);
  }
  if (filter.tag) query = query.contains("tags", [filter.tag]);
  if (filter.tool) query = query.eq("tool", filter.tool);
  return query
    .order(filter.sort === "likes" ? "like_count" : "created_at", {
      ascending: false,
    })
    .limit(60);
}

export async function listPublicTags() {
  return createAdminClient()
    .from("sessions")
    .select("tags")
    .eq("visibility", "public")
    .eq("status", "done")
    .eq("hidden", false)
    .limit(500);
}

export async function replaceInsights(
  sessionId: string,
  rows: Insert<"session_insights">[],
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("session_insights")
    .delete()
    .eq("session_id", sessionId);
  if (error || rows.length === 0) return { error };
  return admin.from("session_insights").insert(rows);
}

export async function getInsightForCopy(insightId: string) {
  return createAdminClient()
    .from("session_insights")
    .select(
      "id, kind, content, prompt_text, sessions!inner(user_id, visibility, status, hidden, tags)",
    )
    .eq("id", insightId)
    .maybeSingle();
}

export async function insertTemplate(row: Insert<"prompt_templates">) {
  return createAdminClient().from("prompt_templates").insert(row);
}

export async function findMyLike(sessionId: string, userId: string) {
  return createAdminClient()
    .from("session_likes")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function insertLike(sessionId: string, userId: string) {
  return createAdminClient()
    .from("session_likes")
    .insert({ session_id: sessionId, user_id: userId });
}

export async function deleteLike(sessionId: string, userId: string) {
  return createAdminClient()
    .from("session_likes")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);
}

export async function getShareableSession(sessionId: string) {
  return createAdminClient()
    .from("sessions")
    .select("id, user_id, visibility, status, hidden, like_count")
    .eq("id", sessionId)
    .maybeSingle();
}

export async function insertReport(row: Insert<"session_reports">) {
  return createAdminClient().from("session_reports").upsert(row, {
    onConflict: "session_id,reporter_id",
    ignoreDuplicates: true,
  });
}

// Storage ---------------------------------------------------------------------

export async function createUploadUrl(path: string) {
  return createAdminClient()
    .storage.from(SESSION_BUCKET)
    .createSignedUploadUrl(path);
}

export async function downloadSessionFile(path: string) {
  return createAdminClient().storage.from(SESSION_BUCKET).download(path);
}

export async function overwriteSessionFile(path: string, body: string) {
  return createAdminClient()
    .storage.from(SESSION_BUCKET)
    .upload(path, new Blob([body], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
    });
}

export async function removeSessionFile(path: string) {
  return createAdminClient().storage.from(SESSION_BUCKET).remove([path]);
}

export async function insertLlmCall(row: Insert<"llm_calls">) {
  return createAdminClient().from("llm_calls").insert(row);
}

export async function addTokenUsage(userId: string, tokens: number) {
  return createAdminClient().rpc("add_token_usage", {
    p_user_id: userId,
    p_tokens: tokens,
  });
}
