import "server-only";
import { installationOctokit } from "./app";

/**
 * 이 GitHub 계정이 리포에서 가진 권한. 설치에 접근할 수 있다고 그 설치의 모든 리포를 볼 수 있는 건 아니므로
 * (리포 하나에 초대된 외부 협업자도 설치 목록에 나온다) 리포마다 확인한다.
 * 확인하지 못하면 권한이 없는 것으로 본다.
 */
export async function repoPermission(
  installationId: number,
  repoFullName: string,
  login: string,
) {
  const [owner, repo] = repoFullName.split("/") as [string, string];
  try {
    const octokit = await installationOctokit(installationId);
    const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner,
      repo,
      username: login,
    });
    return data.permission;
  } catch {
    return "none";
  }
}

export const canWrite = (permission: string) =>
  permission === "admin" || permission === "write" || permission === "maintain";
