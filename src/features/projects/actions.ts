"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  addPublicRepoInput,
  createProjectInput,
  deleteProjectInput,
} from "./schemas";
import {
  addPublicRepo,
  createProject,
  deleteProject,
} from "./services/projects";

export async function createProjectAction(
  input: unknown,
): Promise<Result<{ projectId: string }>> {
  const parsed = createProjectInput.safeParse(input);
  if (!parsed.success)
    return err("invalid_input", "리포 이름이 올바르지 않습니다.");

  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");

  const result = await createProject(user, parsed.data.repoFullName);
  if (result.ok) revalidatePath("/projects");
  return result;
}

export async function addPublicRepoAction(
  input: unknown,
): Promise<Result<{ projectId: string }>> {
  const parsed = addPublicRepoInput.safeParse(input);
  if (!parsed.success)
    return err("invalid_input", "리포 주소를 입력해 주세요.");

  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");

  const result = await addPublicRepo(user, parsed.data.url);
  if (result.ok) revalidatePath("/projects");
  return result;
}

export async function deleteProjectAction(
  input: unknown,
): Promise<Result<null>> {
  const parsed = deleteProjectInput.safeParse(input);
  if (!parsed.success)
    return err("invalid_input", "프로젝트 id 가 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await deleteProject(parsed.data.projectId);
  if (result.ok) revalidatePath("/projects");
  return result;
}
