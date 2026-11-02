"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/shared/lib/safe-redirect";
import { signInWithGitHubOAuth, signOutSession } from "./repository";

export async function signInWithGitHub(formData: FormData) {
  const origin = (await headers()).get("origin");
  const next = safeNextPath(formData.get("next")?.toString());
  const callback = new URL("/auth/callback", origin ?? undefined);
  callback.searchParams.set("next", next);

  const { data, error } = await signInWithGitHubOAuth(callback.toString());
  if (error || !data.url) redirect("/login?error=oauth_start_failed");
  redirect(data.url);
}

export async function signOut() {
  await signOutSession();
  redirect("/login");
}
