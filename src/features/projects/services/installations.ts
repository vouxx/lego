import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { userOctokitFromCode } from "@/lib/github/app";
import { err, ok, type Result } from "@/shared/lib/result";
import { upsertInstallation } from "../repository";

type AccessibleInstallation = { id: number; accountLogin: string };

/**
 * code 로 사용자 토큰을 얻어, 로그인한 레고 사용자와 같은 GitHub 계정인지 확인하고
 * 그 계정이 접근할 수 있는 이 App 의 설치 목록을 돌려준다.
 * 리포 하나에만 초대된 사람도 설치가 나오므로, 연결만으로 리포를 다룰 수는 없다(리포별 쓰기 권한을 따로 본다).
 */
async function accessibleInstallations(
  user: CurrentUser,
  code: string,
): Promise<Result<AccessibleInstallation[]>> {
  try {
    const octokit = await userOctokitFromCode(code);
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    if (githubUser.id !== user.githubUserId) {
      return err(
        "github_user_mismatch",
        "로그인한 GitHub 계정과 읽기를 허용한 계정이 다릅니다.",
      );
    }
    const all = await octokit.paginate(
      octokit.rest.apps.listInstallationsForAuthenticatedUser,
      { per_page: 100 },
    );
    // account 는 사용자/조직이면 login, 엔터프라이즈면 slug 를 가진다.
    return ok(
      all.flatMap((i) => {
        const accountLogin =
          i.account && "login" in i.account
            ? i.account.login
            : (i.account?.slug ?? null);
        return accountLogin ? [{ id: i.id, accountLogin }] : [];
      }),
    );
  } catch {
    return err(
      "github_verify_failed",
      "GitHub에서 연결 정보를 확인하지 못했습니다.",
    );
  }
}

async function saveInstallation(
  user: CurrentUser,
  installation: AccessibleInstallation,
): Promise<Result<null>> {
  const { error } = await upsertInstallation({
    userId: user.id,
    installationId: installation.id,
    accountLogin: installation.accountLogin,
  });
  if (error) return err("db_error", "연결 정보를 저장하지 못했습니다.");
  return ok(null);
}

/**
 * GitHub App 설치 콜백 처리.
 * installation_id 는 URL 로 들어오므로 그대로 믿지 않고, 설치 중 받은 code 의 사용자가
 * 그 설치에 접근할 수 있는지 확인한 뒤 저장한다.
 */
export async function linkInstallation(
  user: CurrentUser,
  code: string,
  installationId: number,
): Promise<Result<{ accountLogin: string }>> {
  const installations = await accessibleInstallations(user, code);
  if (!installations.ok) return installations;

  const installation = installations.data.find((i) => i.id === installationId);
  if (!installation) {
    return err(
      "installation_not_accessible",
      "이 연결에 접근할 권한이 없습니다.",
    );
  }
  const saved = await saveInstallation(user, installation);
  if (!saved.ok) return saved;
  return ok({ accountLogin: installation.accountLogin });
}

/**
 * 이미 설치한 App 을 불러온다. GitHub 는 기존 설치를 다시 저장해도 레고로 돌려보내지 않으므로,
 * 사용자 인증만 받아 접근할 수 있는 설치를 모두 연결한다.
 */
export async function syncInstallations(
  user: CurrentUser,
  code: string,
): Promise<Result<{ linked: number }>> {
  const installations = await accessibleInstallations(user, code);
  if (!installations.ok) return installations;
  if (installations.data.length === 0)
    return err(
      "no_installations",
      "레고에 읽기를 허용한 리포를 찾지 못했습니다.",
    );

  for (const installation of installations.data) {
    const saved = await saveInstallation(user, installation);
    if (!saved.ok) return saved;
  }
  return ok({ linked: installations.data.length });
}
