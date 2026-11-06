import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 목록은 세션(RLS: 소유자만 전체, 멤버는 자기 행), 쓰기는 소유자를 확인한 뒤 secret 키.

/** RLS 로 읽는다. projects 는 소유자에게만 보이므로 쓰기 전 소유 확인에 쓴다. */
export async function findOwnedProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();
}

/** 멤버십·초대를 확인한 뒤에만 부른다(소유자가 아니어도 읽힌다). */
export async function getProjectRow(projectId: string) {
  return createAdminClient()
    .from("projects")
    .select("id, user_id, repo_full_name, default_branch, detected_stack")
    .eq("id", projectId)
    .maybeSingle();
}

export async function getMyMembership(projectId: string, userId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
}

export async function listMyMemberships(userId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId);
}

export async function listProjectRows(ids: string[]) {
  return createAdminClient()
    .from("projects")
    .select("id, repo_full_name, default_branch, detected_stack")
    .in("id", ids)
    .order("created_at", { ascending: false });
}

export async function listProjectMembers(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_members")
    .select("user_id, github_login, avatar_url")
    .eq("project_id", projectId)
    .order("created_at");
}

export async function listProjectInvites(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("project_invites")
    .select("id, github_login, expires_at")
    .eq("project_id", projectId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at");
}

/** 같은 계정을 다시 초대하면 새 링크로 바꾼다(이전 링크는 못 쓰게 된다). */
export async function upsertInvite(row: {
  project_id: string;
  invited_by: string;
  github_login: string;
  token_hash: string;
  expires_at: string;
}) {
  return createAdminClient()
    .from("project_invites")
    .upsert(row, { onConflict: "project_id,github_login" });
}

export async function deleteInvite(projectId: string, inviteId: string) {
  return createAdminClient()
    .from("project_invites")
    .delete()
    .eq("project_id", projectId)
    .eq("id", inviteId);
}

export async function deleteMember(projectId: string, userId: string) {
  return createAdminClient()
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
}

export async function findInviteByHash(tokenHash: string) {
  return createAdminClient()
    .from("project_invites")
    .select("project_id, github_login, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
}

export async function acceptInviteRow(params: {
  tokenHash: string;
  userId: string;
  login: string;
  avatarUrl: string | null;
}) {
  return createAdminClient().rpc("accept_project_invite", {
    p_token_hash: params.tokenHash,
    p_user_id: params.userId,
    p_login: params.login,
    p_avatar: params.avatarUrl ?? "",
  });
}
