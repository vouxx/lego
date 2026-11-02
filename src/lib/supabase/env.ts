import { z } from "zod";

/** 레고의 모든 테이블은 lego 스키마에 있다(Supabase 프로젝트를 다른 앱과 같이 쓰기 때문). */
export const DB_SCHEMA = "lego";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

let cached: z.infer<typeof publicEnvSchema> | undefined;

/** 빌드 중에는 env 가 없을 수 있으므로 처음 쓸 때 검증한다. */
export function publicEnv() {
  cached ??= publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return cached;
}
