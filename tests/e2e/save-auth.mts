/**
 * 브라우저를 띄워 GitHub 로 직접 로그인하면, 세션을 tests/e2e/.auth/user.json 에 저장한다.
 *   pnpm e2e:login
 * 운영: E2E_BASE_URL=https://vouxx-lego.vercel.app E2E_AUTH_FILE=tests/e2e/.auth/prod.json pnpm e2e:login
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const authFile = process.env.E2E_AUTH_FILE ?? "tests/e2e/.auth/user.json";
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto(`${baseURL}/login?next=/projects`);
console.log(
  "열린 브라우저에서 GitHub 로그인을 마치면 자동으로 저장합니다 (최대 5분).",
);
await page.waitForURL(`${baseURL}/projects**`, { timeout: 300_000 });
mkdirSync("tests/e2e/.auth", { recursive: true });
await page.context().storageState({ path: authFile });
console.log(`저장했습니다: ${authFile}`);
await browser.close();
