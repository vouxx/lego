"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NEXT_PATH_COOKIE, safeNextPath } from "@/shared/lib/safe-redirect";
import { signInWithGitHubOAuth, signOutSession } from "./repository";

export async function signInWithGitHub(formData: FormData) {
  const origin = (await headers()).get("origin");
  const next = safeNextPath(formData.get("next")?.toString());
  (await cookies()).set(NEXT_PATH_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/callback",
    maxAge: 600,
  });
  // 쿼리 없는 정확한 주소여야 Supabase Redirect URLs 허용 목록과 맞는다.
  const callback = new URL("/auth/callback", origin ?? undefined);

  const { data, error } = await signInWithGitHubOAuth(callback.toString());
  if (error || !data.url) redirect("/login?error=oauth_start_failed");
  redirect(data.url);
}

export async function signOut() {
  await signOutSession();
  redirect("/login");
}
