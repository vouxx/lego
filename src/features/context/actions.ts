"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  addCustomRuleInput,
  generateContextInput,
  openContextPrInput,
  removeCustomRuleInput,
  saveContextVersionInput,
  toggleRuleInput,
} from "./schemas";
import {
  addCustomRule,
  openContextPr,
  removeCustomRule,
  saveContextVersion,
  toggleRule,
} from "./services/edit";
import { generateContext } from "./services/generate";

const UNAUTHORIZED = err("unauthorized", "로그인이 필요합니다.");

function firstIssue(error: { issues: { message: string }[] }) {
  return err(
    "invalid_input",
    error.issues[0]?.message ?? "입력이 올바르지 않습니다.",
  );
}

export async function generateContextAction(
  input: unknown,
): Promise<Result<{ contextFileId: string }>> {
  const parsed = generateContextInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;

  const result = await generateContext(
    user,
    parsed.data.projectId,
    parsed.data.target,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}/context`);
  return result;
}

export async function toggleRuleAction(
  input: unknown,
): Promise<Result<{ content: string }>> {
  const parsed = toggleRuleInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return toggleRule(user, parsed.data);
}

export async function addCustomRuleAction(
  input: unknown,
): Promise<Result<{ content: string }>> {
  const parsed = addCustomRuleInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return addCustomRule(user, parsed.data);
}

export async function removeCustomRuleAction(
  input: unknown,
): Promise<Result<{ content: string }>> {
  const parsed = removeCustomRuleInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return removeCustomRule(parsed.data);
}

export async function saveContextVersionAction(
  input: unknown,
): Promise<Result<{ versionId: string }>> {
  const parsed = saveContextVersionInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return saveContextVersion(user, parsed.data);
}

export async function openContextPrAction(
  input: unknown,
): Promise<Result<{ prUrl: string }>> {
  const parsed = openContextPrInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return openContextPr(user, parsed.data.contextFileId);
}
