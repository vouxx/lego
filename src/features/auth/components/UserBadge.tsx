/* eslint-disable @next/next/no-img-element -- GitHub 아바타는 작은 외부 이미지라 next/image 설정 없이 쓴다 */
type Props = { githubLogin: string; avatarUrl: string | null };

export function UserBadge({ githubLogin, avatarUrl }: Props) {
  return (
    <span className="flex items-center gap-2 text-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="size-6 rounded-full" />
      ) : null}
      {githubLogin}
    </span>
  );
}
