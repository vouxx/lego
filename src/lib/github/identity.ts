/**
 * Supabase 사용자의 GitHub 신원.
 * user_metadata 는 사용자가 auth.updateUser 로 바꿀 수 있으므로 쓰지 않는다.
 * identities 는 GitHub OAuth 를 거쳐야만 생기고 사용자가 직접 고칠 수 없다.
 */
export type GithubIdentity = {
  login: string;
  id: number;
  avatarUrl: string | null;
};

type IdentityCarrier = {
  identities?:
    | {
        provider: string;
        identity_data?: Record<string, unknown> | undefined;
      }[]
    | undefined;
};

export function githubIdentity(user: IdentityCarrier): GithubIdentity | null {
  const data = user.identities?.find(
    (i) => i.provider === "github",
  )?.identity_data;
  if (!data) return null;
  const id = Number(data.provider_id ?? data.sub);
  if (typeof data.user_name !== "string" || !Number.isInteger(id)) return null;
  return {
    login: data.user_name,
    id,
    avatarUrl: typeof data.avatar_url === "string" ? data.avatar_url : null,
  };
}
