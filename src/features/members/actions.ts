"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  acceptInput,
  cancelInviteInput,
  inviteInput,
  leaveInput,
  removeMemberInput,
} from "./schemas";
import {
  acceptInvite,
  cancelInvite,
  createInvite,
  leaveProject,
  removeMember,
} from "./services/members";

const UNAUTHORIZED = err("unauthorized", "로그인이 필요합니다.");

export async function createInviteAction(
  input: unknown,
): Promise<Result<{ token: string; githubLogin: string }>> {
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success)
    return err(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.",
    );
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await createInvite(
    user,
    parsed.data.projectId,
    parsed.data.githubLogin,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}

export async function cancelInviteAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = cancelInviteInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await cancelInvite(
    user,
    parsed.data.projectId,
    parsed.data.inviteId,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}

export async function removeMemberAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = removeMemberInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await removeMember(
    user,
    parsed.data.projectId,
    parsed.data.userId,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}

export async function leaveProjectAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = leaveInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await leaveProject(user, parsed.data.projectId);
  if (result.ok) revalidatePath("/projects");
  return result;
}

export async function acceptInviteAction(
  input: unknown,
): Promise<Result<{ projectId: string }>> {
  const parsed = acceptInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await acceptInvite(user, parsed.data.token);
  if (result.ok) revalidatePath("/projects");
  return result;
}
