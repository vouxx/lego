import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "./database.types";
import { DB_SCHEMA, publicEnv } from "./env";

/**
 * secret 키로 RLS 를 우회하는 클라이언트. Server Action, Route Handler 의 repository 에서만 쓴다.
 * 호출하기 전에 반드시 사용자 권한을 확인한다.
 */
export function createAdminClient() {
  return createClient<Database, typeof DB_SCHEMA>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      db: { schema: DB_SCHEMA },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
