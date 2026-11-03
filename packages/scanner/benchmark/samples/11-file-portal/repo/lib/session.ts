import "server-only";
import { createServerSupabase } from "./supabase-server";

/** 현재 로그인한 사용자. 없으면 null */
export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}
