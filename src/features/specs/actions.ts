"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  answerQuestionsInput,
  createSpecInput,
  deleteSpecInput,
  regenerateTaskPromptInput,
  saveTemplateInput,
  updatePrdInput,
  updateTaskStatusInput,
} from "./schemas";
import {
  answerQuestions,
  createSpec,
  deleteSpec,
  regenerateTaskPrompt,
  saveTaskAsTemplate,
  updatePrd,
  updateTaskStatus,
} from "./services/specs";

const UNAUTHORIZED = err("unauthorized", "로그인이 필요합니다.");

function firstIssue(error: { issues: { message: string }[] }) {
  return err(
    "invalid_input",
    error.issues[0]?.message ?? "입력이 올바르지 않습니다.",
  );
}

export async function createSpecAction(
  input: unknown,
): Promise<Result<{ specId: string }>> {
  const parsed = createSpecInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return createSpec(user, parsed.data);
}

export async function answerQuestionsAction(
  input: unknown,
): Promise<Result<{ specId: string }>> {
  const parsed = answerQuestionsInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return answerQuestions(parsed.data);
}

export async function updatePrdAction(input: unknown): Promise<Result<null>> {
  const parsed = updatePrdInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return updatePrd(parsed.data);
}

export async function updateTaskStatusAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = updateTaskStatusInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return updateTaskStatus(parsed.data);
}

export async function regenerateTaskPromptAction(
  input: unknown,
): Promise<Result<{ prompt: string }>> {
  const parsed = regenerateTaskPromptInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return regenerateTaskPrompt(user, parsed.data);
}

export async function saveTaskTemplateAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = saveTemplateInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return saveTaskAsTemplate(user, parsed.data.taskId);
}

export async function deleteSpecAction(input: unknown): Promise<Result<null>> {
  const parsed = deleteSpecInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  const result = await deleteSpec(parsed.data.specId);
  if (result.ok) revalidatePath("/specs");
  return result;
}
