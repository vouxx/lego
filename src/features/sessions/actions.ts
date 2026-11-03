"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  createUploadInput,
  deleteSessionInput,
  finalizeInput,
  insightIdInput,
  reportInput,
  retryAnalysisInput,
  setVisibilityInput,
  toggleLikeInput,
} from "./schemas";
import {
  reportSession,
  saveInsightAsTemplate,
  setVisibility,
  toggleLike,
} from "./services/share";
import {
  createSessionUpload,
  deleteSession,
  finalizeSession,
  retryAnalysis,
} from "./services/upload";

const UNAUTHORIZED = err("unauthorized", "로그인이 필요합니다.");

function firstIssue(error: { issues: { message: string }[] }) {
  return err(
    "invalid_input",
    error.issues[0]?.message ?? "입력이 올바르지 않습니다.",
  );
}

export async function createSessionUploadAction(
  input: unknown,
): Promise<Result<{ sessionId: string; uploadUrl: string }>> {
  const parsed = createUploadInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return createSessionUpload(user, parsed.data);
}

export async function finalizeSessionAction(
  input: unknown,
): Promise<Result<{ sessionId: string }>> {
  const parsed = finalizeInput
    .extend({ maskedCount: z.number().int().min(0).max(1_000_000) })
    .safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return finalizeSession(parsed.data.sessionId, parsed.data.maskedCount);
}

export async function retryAnalysisAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = retryAnalysisInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return retryAnalysis(parsed.data.sessionId);
}

export async function deleteSessionAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = deleteSessionInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await deleteSession(parsed.data.sessionId);
  if (result.ok) revalidatePath("/sessions");
  return result;
}

export async function setVisibilityAction(
  input: unknown,
): Promise<Result<{ slug: string | null }>> {
  const parsed = setVisibilityInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await setVisibility(parsed.data);
  if (result.ok) revalidatePath("/gallery");
  return result;
}

export async function saveInsightTemplateAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = insightIdInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return saveInsightAsTemplate(user, parsed.data.insightId);
}

export async function toggleLikeAction(
  input: unknown,
): Promise<Result<{ liked: boolean }>> {
  const parsed = toggleLikeInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return toggleLike(user, parsed.data.sessionId);
}

export async function reportSessionAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = reportInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return reportSession(user, parsed.data);
}
