import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { getMyMembership, getProjectRow } from "../repository";

export type ProjectAccess = {
  role: "owner" | "viewer";
  repoFullName: string;
  defaultBranch: string;
  detectedStack: unknown;
};

/**
 * 지금 사용자가 이 프로젝트를 볼 수 있는지. 소유자도 멤버도 아니면 null.
 * 화면 표시용이다. 쓰기는 소유자만 읽히는 projects RLS 로 따로 확인한다.
 */
export async function getProjectAccess(
  projectId: string,
): Promise<ProjectAccess | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data: project } = await getProjectRow(projectId);
  if (!project) return null;

  const isOwner = project.user_id === user.id;
  if (!isOwner) {
    const { data: membership } = await getMyMembership(projectId, user.id);
    if (!membership) return null;
  }
  return {
    role: isOwner ? "owner" : "viewer",
    repoFullName: project.repo_full_name,
    defaultBranch: project.default_branch,
    detectedStack: project.detected_stack,
  };
}
