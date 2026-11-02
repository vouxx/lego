import { createBrowserClient } from "@supabase/ssr";

// anon 키는 공개용이라 번들에 들어가도 된다 (데이터 보호는 RLS 가 한다)
const SUPABASE_URL = "https://abcdefghijklmnopqrst.supabase.co";
const SUPABASE_ANON_KEY = "{{ANON_JWT}}";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
