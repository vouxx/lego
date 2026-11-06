import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { err, ok, type Result } from "@/shared/lib/result";
import { detectedStackSchema } from "@/shared/stack/schema";
import {
  acceptInviteRow,
  deleteInvite,
  deleteMember,
  findInviteByHash,
  findOwnedProject,
  getProjectRow,
  listMyMemberships,
  listProjectInvites,
  listProjectMembers,
  listProjectRows,
  upsertInvite,
} from "../repository";
import {
  INVITE_DAYS,
  MAX_MEMBERS,
  type InviteView,
  type MemberView,
  type PendingInviteView,
} from "../schemas";
import { hashInviteToken, newInviteToken, sameLogin } from "./invite-token";

const NOT_FOUND = err("not_found", "프로젝트를 찾을 수 없습니다.");

/** 프로젝트 화면(소유자만): 멤버와 대기 중인 초대 */
export async function getMembersState(projectId: string): Promise<{
  members: MemberView[];
  invites: PendingInviteView[];
}> {
  const [{ data: members }, { data: invites }] = await Promise.all([
    listProjectMembers(projectId),
    listProjectInvites(projectId),
  ]);
  return {
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      githubLogin: m.github_login,
      avatarUrl: m.avatar_url || null,
    })),
    invites: (invites ?? []).map((i) => ({
      id: i.id,
      githubLogin: i.github_login,
      expiresAt: i.expires_at,
    })),
  };
}

/** 초대 링크를 만든다. 토큰 원문은 이때 한 번만 돌려준다. */
export async function createInvite(
  user: CurrentUser,
  projectId: string,
  githubLogin: string,
): Promise<Result<{ token: string; githubLogin: string }>> {
  const { data: project } = await findOwnedProject(projectId);
  if (!project || project.user_id !== user.id) return NOT_FOUND;
  if (sameLogin(githubLogin, user.githubLogin))
    return err("self_invite", "본인은 초대하지 않아도 됩니다.");

  const login = githubLogin.toLowerCase();
  const { members, invites } = await getMembersState(projectId);
  if (members.some((m) => sameLogin(m.githubLogin, login)))
    return err("already_member", "이미 멤버입니다.");
  const pending = invites.filter((i) => i.githubLogin !== login).length;
  if (members.length + pending >= MAX_MEMBERS)
    return err(
      "too_many",
      `프로젝트 하나에 ${MAX_MEMBERS}명까지 초대할 수 있습니다.`,
    );

  const token = newInviteToken();
  const { error } = await upsertInvite({
    project_id: projectId,
    invited_by: user.id,
    github_login: login,
    token_hash: hashInviteToken(token),
    expires_at: new Date(
      Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  });
  if (error) return err("db_error", "초대를 만들지 못했습니다.");
  return ok({ token, githubLogin: login });
}

export async function cancelInvite(
  user: CurrentUser,
  projectId: string,
  inviteId: string,
): Promise<Result<null>> {
  const { data: project } = await findOwnedProject(projectId);
  if (!project || project.user_id !== user.id) return NOT_FOUND;
  const { error } = await deleteInvite(projectId, inviteId);
  return error ? err("db_error", "초대를 취소하지 못했습니다.") : ok(null);
}

export async function removeMember(
  user: CurrentUser,
  projectId: string,
  userId: string,
): Promise<Result<null>> {
  const { data: project } = await findOwnedProject(projectId);
  if (!project || project.user_id !== user.id) return NOT_FOUND;
  const { error } = await deleteMember(projectId, userId);
  return error ? err("db_error", "멤버를 내보내지 못했습니다.") : ok(null);
}

export async function leaveProject(
  user: CurrentUser,
  projectId: string,
): Promise<Result<null>> {
  const { error } = await deleteMember(projectId, user.id);
  return error ? err("db_error", "프로젝트에서 나가지 못했습니다.") : ok(null);
}

/** 초대 화면. 초대받은 계정이 아니면 리포 이름을 보여 주지 않는다. */
export async function getInviteView(
  user: CurrentUser,
  token: string,
): Promise<InviteView> {
  const { data: invite } = await findInviteByHash(hashInviteToken(token));
  if (!invite || Date.parse(invite.expires_at) <= Date.now())
    return { state: "invalid" };
  if (!sameLogin(invite.github_login, user.githubLogin))
    return { state: "wrong_account", githubLogin: invite.github_login };
  const { data: project } = await getProjectRow(invite.project_id);
  if (!project) return { state: "invalid" };
  return { state: "ready", repoFullName: project.repo_full_name };
}

export async function acceptInvite(
  user: CurrentUser,
  token: string,
): Promise<Result<{ projectId: string }>> {
  const tokenHash = hashInviteToken(token);
  const { data: invite } = await findInviteByHash(tokenHash);
  if (invite) {
    const { data: project } = await getProjectRow(invite.project_id);
    if (project?.user_id === user.id) return err("owner", "내 프로젝트입니다.");
  }
  const { data: projectId, error } = await acceptInviteRow({
    tokenHash,
    userId: user.id,
    login: user.githubLogin,
    avatarUrl: user.avatarUrl,
  });
  if (error) return err("db_error", "초대를 수락하지 못했습니다.");
  if (!projectId)
    return err(
      "invalid_invite",
      "만료됐거나 이미 쓴 초대입니다. 새 링크를 요청해 주세요.",
    );
  return ok({ projectId });
}

/** 프로젝트 목록: 초대받아 보는 프로젝트 */
export async function getSharedProjects(user: CurrentUser) {
  const { data: memberships } = await listMyMemberships(user.id);
  const ids = (memberships ?? []).map((m) => m.project_id);
  if (ids.length === 0) return [];
  const { data } = await listProjectRows(ids);
  return (data ?? []).map((p) => {
    const stack = detectedStackSchema.safeParse(p.detected_stack);
    return {
      id: p.id,
      repoFullName: p.repo_full_name,
      defaultBranch: p.default_branch,
      stack: stack.success ? stack.data : null,
    };
  });
}
