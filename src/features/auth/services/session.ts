import "server-only";
import { err, ok, type Result } from "@/shared/lib/result";
import { exchangeCodeForSession, upsertProfile } from "../repository";

/** OAuth 콜백: 세션을 만들고 lego.profiles 를 맞춘다. */
export async function completeGitHubSignIn(
  code: string,
): Promise<Result<null>> {
  const { data, error } = await exchangeCodeForSession(code);
  if (error || !data.user) {
    return err("auth_exchange_failed", "GitHub 로그인을 완료하지 못했습니다.");
  }

  const meta = data.user.user_metadata;
  if (typeof meta.user_name !== "string") {
    return err("not_github_user", "GitHub 계정으로 로그인해 주세요.");
  }

  const { error: profileError } = await upsertProfile({
    id: data.user.id,
    githubLogin: meta.user_name,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  });
  if (profileError) {
    return err("profile_upsert_failed", "프로필을 저장하지 못했습니다.");
  }

  return ok(null);
}
