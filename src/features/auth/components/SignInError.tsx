const MESSAGES: Record<string, string> = {
  missing_code: "GitHub에서 로그인 정보를 받지 못했습니다. 다시 시도해 주세요.",
  auth_exchange_failed:
    "GitHub 로그인을 완료하지 못했습니다. 다시 시도해 주세요.",
  oauth_start_failed: "GitHub 로그인을 시작하지 못했습니다.",
  not_github_user: "레고는 GitHub 계정으로만 로그인할 수 있습니다.",
  profile_upsert_failed:
    "프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

type Props = { code?: string };

export function SignInError({ code }: Props) {
  if (!code) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {MESSAGES[code] ?? "로그인 중 문제가 생겼습니다."}
    </p>
  );
}
