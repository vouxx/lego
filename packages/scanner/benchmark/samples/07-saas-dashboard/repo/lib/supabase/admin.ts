import { createClient } from "@supabase/supabase-js";

// Vercel preview 에서 env 가 비어 있을 때를 대비한 기본값
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "{{SERVICE_ROLE_JWT}}";

export const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
