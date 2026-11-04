import { expect, test } from "@playwright/test";

test("랜딩 페이지가 도구 5개와 점검 항목 22개를 보여 준다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /배포 전에 한 번 더/ }),
  ).toBeVisible();
  for (const tool of [
    "스펙 변환기",
    "규칙 파일 생성기",
    "보안 점검기",
    "PR 가드",
    "운영 점검",
  ]) {
    await expect(
      page.getByRole("heading", { level: 3, name: tool }),
    ).toBeVisible();
  }
  const catalog = page.locator("#rules");
  for (let i = 1; i <= 22; i++) {
    await expect(
      catalog.getByText(`SEC-${String(i).padStart(3, "0")}`, { exact: true }),
    ).toBeVisible();
  }
});

test("로그인하지 않고 시작하면 로그인 화면으로 보낸다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "내 리포 무료 점검" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
  await expect(
    page.getByRole("button", { name: "GitHub로 계속하기" }),
  ).toBeVisible();
});

test("로그인 후 이동 경로로 외부 주소를 받지 않는다", async ({ page }) => {
  await page.goto("/login?next=https://evil.example.com");
  const next = page.locator('input[name="next"]');
  if ((await next.count()) > 0)
    await expect(next).not.toHaveValue(/evil\.example\.com/);
});

test("워커 엔드포인트는 비밀값 없이 호출할 수 없다", async ({ request }) => {
  const res = await request.post("/api/scan-worker", {
    headers: { authorization: "Bearer wrong-secret-wrong-secret" },
  });
  expect(res.status()).toBe(401);
});

test("webhook 은 서명이 없으면 거절한다", async ({ request }) => {
  const res = await request.post("/api/github/webhook", {
    data: { action: "deleted" },
    headers: { "x-github-event": "installation" },
  });
  expect(res.status()).toBe(401);
});
