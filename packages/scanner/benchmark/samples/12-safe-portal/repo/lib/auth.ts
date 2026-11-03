import "server-only";
import { createServerSupabase } from "./supabase-server";

/** 토큰을 Supabase Auth 서버에서 검증한 사용자 */
export async function getCurrentUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
