import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function exchangeCodeForSession(code: string) {
  const supabase = await createClient();
  return supabase.auth.exchangeCodeForSession(code);
}

export async function signInWithGitHubOAuth(redirectTo: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo },
  });
}

export async function signOutSession() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}

export async function upsertProfile(profile: {
  id: string;
  githubLogin: string;
  avatarUrl: string | null;
}) {
  return createAdminClient().from("profiles").upsert(
    {
      id: profile.id,
      github_login: profile.githubLogin,
      avatar_url: profile.avatarUrl,
    },
    { onConflict: "id" },
  );
}
