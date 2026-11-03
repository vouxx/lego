"use server";

import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  explainFileInput,
  explainFindingInput,
  explainPasteInput,
  retryDiagramInput,
  submitQuizInput,
  type QuizResult,
} from "./schemas";
import {
  explainFile,
  explainFinding,
  explainPaste,
  retryDiagram,
} from "./services/explain";
import { submitQuiz } from "./services/quiz";

const UNAUTHORIZED = err("unauthorized", "로그인이 필요합니다.");

function firstIssue(error: { issues: { message: string }[] }) {
  return err(
    "invalid_input",
    error.issues[0]?.message ?? "입력이 올바르지 않습니다.",
  );
}

type Created = Promise<Result<{ explanationId: string }>>;

export async function explainPasteAction(input: unknown): Created {
  const parsed = explainPasteInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return explainPaste(user, parsed.data);
}

export async function explainFileAction(input: unknown): Created {
  const parsed = explainFileInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return explainFile(user, parsed.data);
}

export async function explainFindingAction(input: unknown): Created {
  const parsed = explainFindingInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return explainFinding(user, parsed.data);
}

export async function submitQuizAction(
  input: unknown,
): Promise<Result<QuizResult>> {
  const parsed = submitQuizInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return submitQuiz(user, parsed.data);
}

export async function retryDiagramAction(
  input: unknown,
): Promise<Result<{ mermaid: string | null }>> {
  const parsed = retryDiagramInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const user = await getCurrentUser();
  if (!user) return UNAUTHORIZED;
  return retryDiagram(user, parsed.data.explanationId);
}
