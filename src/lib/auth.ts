import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
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

  const meta = user.user_metadata;
  const githubUserId = Number(meta.provider_id);
  if (typeof meta.user_name !== "string" || !Number.isInteger(githubUserId)) {
    return null; // GitHub 로 로그인하지 않은 사용자(공유 프로젝트의 다른 앱 계정)
  }

  return {
    id: user.id,
    githubLogin: meta.user_name,
    githubUserId,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
