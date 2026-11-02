import "server-only";
import { createClient } from "@supabase/supabase-js";

// service_role 키는 서버에서만. server-only 덕분에 클라이언트에서 import 하면 빌드가 실패한다.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
