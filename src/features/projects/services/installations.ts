import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { userOctokitFromCode } from "@/lib/github/app";
import { err, ok, type Result } from "@/shared/lib/result";
import { findInstallation, upsertInstallation } from "../repository";

/**
 * GitHub App 설치 콜백 처리.
 * installation_id 는 URL 로 들어오므로 그대로 믿지 않는다. 설치 중 받은 code 로 사용자 토큰을 얻어
 * (1) 로그인한 레고 사용자와 같은 GitHub 계정인지, (2) 그 계정이 해당 설치에 접근할 수 있는지 확인한다.
 */
export async function linkInstallation(
  user: CurrentUser,
  code: string,
  installationId: number,
): Promise<Result<{ accountLogin: string }>> {
  let installations: { id: number; accountLogin: string | null }[];
  try {
    const octokit = await userOctokitFromCode(code);
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    if (githubUser.id !== user.githubUserId) {
      return err(
        "github_user_mismatch",
        "로그인한 GitHub 계정과 설치한 계정이 다릅니다.",
      );
    }
    const all = await octokit.paginate(
      octokit.rest.apps.listInstallationsForAuthenticatedUser,
      { per_page: 100 },
    );
    // account 는 사용자/조직이면 login, 엔터프라이즈면 slug 를 가진다.
    installations = all.map((i) => ({
      id: i.id,
      accountLogin:
        i.account && "login" in i.account
          ? i.account.login
          : (i.account?.slug ?? null),
    }));
  } catch {
    return err(
      "github_verify_failed",
      "GitHub에서 설치 정보를 확인하지 못했습니다.",
    );
  }

  const installation = installations.find((i) => i.id === installationId);
  const accountLogin = installation?.accountLogin;
  if (!installation || !accountLogin) {
    return err(
      "installation_not_accessible",
      "이 설치에 접근할 권한이 없습니다.",
    );
  }

  const { data: existing, error: findError } =
    await findInstallation(installationId);
  if (findError) return err("db_error", "설치 정보를 확인하지 못했습니다.");
  if (existing && existing.user_id !== user.id) {
    return err(
      "installation_taken",
      "다른 레고 사용자가 이미 연결한 설치입니다.",
    );
  }

  const { error } = await upsertInstallation({
    userId: user.id,
    installationId,
    accountLogin,
  });
  if (error) return err("db_error", "설치 정보를 저장하지 못했습니다.");

  return ok({ accountLogin });
}
