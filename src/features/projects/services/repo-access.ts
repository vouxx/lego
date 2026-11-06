import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { canWrite, repoPermission } from "@/lib/github/repo-access";
import { err, type Result } from "@/shared/lib/result";

const MESSAGE =
  "이 리포에 쓰기 권한이 있는 GitHub 계정만 할 수 있습니다. 조직 관리자에게 권한을 요청해 주세요.";

/**
 * 스캔·PR 가드·규칙 파일 PR 처럼 리포에 영향을 주는 동작 전에 지금도 권한이 있는지 확인한다.
 * 조직을 나가거나 권한이 줄어든 뒤에는 막힌다. 주소로 등록한 공개 리포는 등록할 때 소유자를 확인했다.
 */
export async function assertRepoWrite(
  user: CurrentUser,
  project: { installation_id: number | null; repo_full_name: string },
): Promise<Result<never> | null> {
  if (project.installation_id === null) return null;
  const permission = await repoPermission(
    project.installation_id,
    project.repo_full_name,
    user.githubLogin,
  );
  return canWrite(permission) ? null : err("repo_write_required", MESSAGE);
}
