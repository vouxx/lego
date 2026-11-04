"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import { createTargetInput, targetInput } from "./schemas";
import {
  createTarget,
  removeTarget,
  runManualCheck,
  verifyTarget,
} from "./services/live";

const path = (projectId: string) => `/projects/${projectId}/live`;

export async function createLiveTargetAction(
  input: unknown,
): Promise<Result<{ token: string }>> {
  const parsed = createTargetInput.safeParse(input);
  if (!parsed.success)
    return err(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "주소를 확인해 주세요.",
    );
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await createTarget(parsed.data.projectId, parsed.data.siteUrl);
  if (result.ok) revalidatePath(path(parsed.data.projectId));
  return result;
}

export async function verifyLiveTargetAction(
  input: unknown,
): Promise<Result<{ verified: true }>> {
  const parsed = targetInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await verifyTarget(parsed.data.projectId);
  if (result.ok) revalidatePath(path(parsed.data.projectId));
  return result;
}

export async function runLiveCheckAction(
  input: unknown,
): Promise<Result<{ checkId: string }>> {
  const parsed = targetInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await runManualCheck(parsed.data.projectId);
  revalidatePath(path(parsed.data.projectId));
  return result;
}

export async function removeLiveTargetAction(input: {
  projectId: string;
}): Promise<Result<null>> {
  const parsed = targetInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await removeTarget(parsed.data.projectId);
  if (!result.ok) return result;
  revalidatePath(path(parsed.data.projectId));
  return { ok: true, data: null };
}
