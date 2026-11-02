import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_SLUG: z.string().min(1),
  GITHUB_APP_CLIENT_ID: z.string().min(1),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1),
  // .env 에 한 줄로 넣을 수 있도록 \n 을 실제 줄바꿈으로 바꾼다.
  GITHUB_APP_PRIVATE_KEY: z
    .string()
    .min(1)
    .transform((key) => key.replace(/\\n/g, "\n")),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

/** 서버 전용 비밀값. 처음 쓸 때 검증한다. */
export function serverEnv() {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
