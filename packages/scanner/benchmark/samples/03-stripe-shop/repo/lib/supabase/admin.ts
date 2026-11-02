import "server-only";
import { createClient } from "@supabase/supabase-js";

// RLS 를 우회하는 서버 전용 클라이언트
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
