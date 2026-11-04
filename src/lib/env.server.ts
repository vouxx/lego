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
  // 없으면 스캔은 정적 탐지 결과만 저장한다(LLM 판별·수정 프롬프트 생략).
  ANTHROPIC_API_KEY: z.string().min(1).optional().catch(undefined),
  // 없으면 /api/scan-worker 를 막는다. pg_cron 이 배포 주소를 부를 때 쓴다.
  SCAN_WORKER_SECRET: z.string().min(16).optional().catch(undefined),
  // 로컬 E2E 의 GitHub API 모의 서버 주소. 운영(production)에서는 무시한다.
  GITHUB_API_URL: z.url().optional().catch(undefined),
  // 사용자용 Slack 알림("Slack 에 추가"). 없으면 프로젝트 화면에서 연결 버튼을 막는다.
  SLACK_CLIENT_ID: z.string().min(1).optional().catch(undefined),
  SLACK_CLIENT_SECRET: z.string().min(1).optional().catch(undefined),
  // 로컬 E2E 의 Slack API 모의 서버 주소. 운영(production)에서는 무시한다.
  SLACK_API_URL: z.url().optional().catch(undefined),
  // 관리자 화면(/admin/*)을 볼 수 있는 로그인 계정의 auth user id(uuid), 쉼표로 구분.
  ADMIN_USER_IDS: z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

let cached: z.infer<typeof serverEnvSchema> | undefined;

/** 서버 전용 비밀값. 처음 쓸 때 검증한다. */
export function serverEnv() {
  cached ??= serverEnvSchema.parse(process.env);
  return cached;
}
