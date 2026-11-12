import type { ReactNode } from "react";
import Link from "next/link";
import { getCurrentUser, isAdmin, requireUser } from "@/lib/auth";
import { SignOutButton } from "./SignOutButton";
import { StartLink } from "./StartLink";
import { UserBadge } from "./UserBadge";

type Props = {
  /** 대시보드처럼 로그인이 꼭 필요한 화면이면 로그인 화면으로 보낸다 */
  required?: boolean;
  /** 로그인하지 않았을 때 보여 줄 것. 기본은 '시작하기' 버튼 */
  signedOut?: ReactNode;
};

/** 헤더 오른쪽: 로그인했으면 계정과 로그아웃, 아니면 시작하기. 쿠키를 읽으므로 Suspense 안에서 쓴다. */
export async function HeaderAccount({
  required = false,
  signedOut = <StartLink />,
}: Props) {
  const user = required ? await requireUser() : await getCurrentUser();
  if (!user) return signedOut;
  return (
    <>
      {isAdmin(user) ? (
        <Link
          href="/admin/feedback"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          관리
        </Link>
      ) : null}
      <span className="hidden sm:inline">
        <UserBadge githubLogin={user.githubLogin} avatarUrl={user.avatarUrl} />
      </span>
      <SignOutButton />
    </>
  );
}
