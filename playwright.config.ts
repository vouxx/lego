import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

export const AUTH_STATE = "tests/e2e/.auth/user.json";

/**
 * E2E. 로그인이 필요한 흐름은 `pnpm e2e:login` 으로 세션을 저장해 둔 경우에만 돈다
 * (GitHub OAuth 는 자동화하지 않는다).
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
  ],
});
