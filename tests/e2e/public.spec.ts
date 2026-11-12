import { expect, test } from "@playwright/test";

test("랜딩 페이지가 점검 화면과 규칙 22개의 탐지율을 보여 준다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /배포 전에 점검합니다/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("figure", { name: /점검 결과 화면 예시/ }),
  ).toBeVisible();
  const accuracy = page.locator("#accuracy");
  await expect(
    accuracy.getByRole("heading", { level: 2, name: /9개는 놓쳤습니다/ }),
  ).toBeVisible();
  for (let i = 1; i <= 22; i++) {
    await expect(
      accuracy.getByText(`SEC-${String(i).padStart(3, "0")}`, { exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator("#case")).toBeVisible();
  await expect(page.locator("#data")).toBeVisible();
});

test("로그인하지 않고 시작하면 로그인 화면으로 보낸다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "GitHub 로 리포 점검" }).first().click();
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

test("로그인 뒤 화면은 iframe 에 넣을 수 없다", async ({ request }) => {
  const headers = (await request.get("/login")).headers();
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("same-origin");
});

test("로그인 뒤 이동 주소로 다른 사이트를 넘길 수 없다", async ({ page }) => {
  await page.goto("/login?next=/%09/evil.example");
  const next = await page.locator('input[name="next"]').first().inputValue();
  expect(next).toBe("/projects");
});

test("공개 페이지는 허용한 출처에서만 iframe 으로 띄울 수 있다", async ({
  request,
}) => {
  for (const path of ["/", "/concepts", "/concepts/hardcoded-secrets"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"], path).toContain(
      "frame-ancestors 'self'",
    );
    expect(headers["x-frame-options"], path).toBeUndefined();
  }
  for (const path of ["/projects", "/invites/x", "/api/health"]) {
    const headers = (await request.get(path, { maxRedirects: 0 })).headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
  }
});
