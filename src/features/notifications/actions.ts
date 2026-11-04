"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import { notifySettingInput, projectInput } from "./schemas";
import {
  changeNotify,
  disconnectSlack,
  sendSlackTest,
} from "./services/settings";

export async function setNotifyAction(input: unknown): Promise<Result<null>> {
  const parsed = notifySettingInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await changeNotify(
    user,
    parsed.data.projectId,
    parsed.data.kind,
    parsed.data.enabled,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}

export async function disconnectSlackAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = projectInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await disconnectSlack(user, parsed.data.projectId);
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}

export async function sendSlackTestAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = projectInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await sendSlackTest(user, parsed.data.projectId);
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}
