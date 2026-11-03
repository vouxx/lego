import { getCurrentUser, requireUser } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import { StartLink } from "./StartLink";
import { UserBadge } from "./UserBadge";

type Props = {
  /** 대시보드처럼 로그인이 꼭 필요한 화면이면 로그인 화면으로 보낸다 */
  required?: boolean;
};

/** 헤더 오른쪽: 로그인했으면 계정과 로그아웃, 아니면 시작하기. 쿠키를 읽으므로 Suspense 안에서 쓴다. */
export async function HeaderAccount({ required = false }: Props) {
  const user = required ? await requireUser() : await getCurrentUser();
  if (!user) return <StartLink />;
  return (
    <>
      <span className="hidden sm:inline">
        <UserBadge githubLogin={user.githubLogin} avatarUrl={user.avatarUrl} />
      </span>
      <SignOutButton />
    </>
  );
}
