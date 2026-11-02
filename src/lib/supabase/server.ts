import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { DB_SCHEMA, publicEnv } from "./env";

export async function createClient() {
  // supabase-js 가 세션 만료 확인에 Date.now() 를 쓴다. 미리 렌더링(prefetch 포함)에서 빠지도록 요청 시점까지 기다린다.
  await connection();
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database, typeof DB_SCHEMA>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      db: { schema: DB_SCHEMA },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy 가 맡는다.
          }
        },
      },
    },
  );
}
