import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverEnv } from "@/lib/env.server";
import { githubIdentity } from "@/lib/github/identity";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  githubLogin: string;
  /** GitHub 숫자 id. GitHub App 설치 소유자 확인에 쓴다. */
  githubUserId: number;
  avatarUrl: string | null;
};

/** 요청 하나 안에서 한 번만 세션을 읽는다. 쿠키를 읽으므로 Suspense 안에서 호출한다. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  // GitHub 로 로그인하지 않은 사용자(공유 프로젝트의 다른 앱 계정)는 identity 가 없다.
  const github = githubIdentity(user);
  if (!github) return null;

  return {
    id: user.id,
    githubLogin: github.login,
    githubUserId: github.id,
    avatarUrl: github.avatarUrl,
  };
});

/**
 * 관리자인지. 서버가 정한 auth user id 로만 판단한다.
 */
export function isAdmin(user: CurrentUser | null) {
  return !!user && serverEnv().ADMIN_USER_IDS.includes(user.id);
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
