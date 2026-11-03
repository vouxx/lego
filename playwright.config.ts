import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

export const AUTH_STATE = "tests/e2e/.auth/user.json";
export const LOCAL_AUTH_STATE = "tests/e2e/.auth/local.json";
export const PROD_AUTH_STATE = "tests/e2e/.auth/prod.json";

/**
 * E2E. 로그인이 필요한 흐름은 `pnpm e2e:login` 으로 세션을 저장해 둔 경우에만 돈다
 * (GitHub OAuth 는 자동화하지 않는다). local-signed-in 은 로컬 Supabase 에서
 * `pnpm e2e:local-seed` 로 만든 테스트 사용자 세션으로 돈다.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "signed-in",
      testMatch: /scan-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: existsSync(AUTH_STATE) ? AUTH_STATE : undefined,
      },
    },
    {
      name: "local-signed-in",
      testMatch: /(context|spec|learn|session|delete)-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: existsSync(LOCAL_AUTH_STATE)
          ? LOCAL_AUTH_STATE
          : undefined,
      },
    },
    {
      // 운영 점검: E2E_BASE_URL 을 운영 주소로 두고 실행한다(tests/e2e/prod-flow.spec.ts 참고).
      name: "prod-signed-in",
      testMatch: /prod-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: existsSync(PROD_AUTH_STATE) ? PROD_AUTH_STATE : undefined,
      },
    },
  ],
});
