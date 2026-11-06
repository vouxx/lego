import { z } from "zod";

/** 소유자를 뺀 멤버와 대기 중인 초대를 합친 프로젝트당 한도 */
export const MAX_MEMBERS = 10;
export const INVITE_DAYS = 7;

const githubLogin = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .pipe(
    z
      .string()
      .regex(/^[a-z\d](?:[a-z\d-]{0,38})$/i, "GitHub 아이디를 확인해 주세요."),
  );

export const inviteInput = z.object({ projectId: z.uuid(), githubLogin });
export const cancelInviteInput = z.object({
  projectId: z.uuid(),
  inviteId: z.uuid(),
});
export const removeMemberInput = z.object({
  projectId: z.uuid(),
  userId: z.uuid(),
});
export const leaveInput = z.object({ projectId: z.uuid() });
export const acceptInput = z.object({ token: z.string().min(20).max(100) });

export type MemberView = {
  userId: string;
  githubLogin: string;
  avatarUrl: string | null;
};
export type PendingInviteView = {
  id: string;
  githubLogin: string;
  expiresAt: string;
};
export type InviteView =
  | { state: "invalid" }
  | { state: "wrong_account"; githubLogin: string }
  | { state: "ready"; repoFullName: string };
