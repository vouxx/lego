import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PROD_AUTH_STATE } from "../../playwright.config";

/**
 * 1단계 완료 기준: 처음 온 사람이 리포 등록 → 스캔 → 수정 프롬프트 복사까지 3분 안.
 * GitHub 로그인(OAuth)은 자동화하지 않으므로 로그인한 다음부터 잰다. 운영 주소에서만 돈다.
 * 등록한 리포는 끝에 지운다. AI 비용은 리포 크기에 따라 $0.1~0.3.
 */
const REPO = process.env.E2E_ONBOARD_REPO ?? "vouxx/Moodify";
const LIMIT_MS = 180_000;

test.skip(
  !existsSync(PROD_AUTH_STATE) || !process.env.E2E_BASE_URL,
  "운영 주소(E2E_BASE_URL)와 운영 로그인 세션이 필요합니다",
);

test("리포 등록부터 수정 프롬프트 복사까지 3분 안에 끝난다", async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto("/projects", { waitUntil: "networkidle" });
  const already = await page
    .getByRole("main")
    .getByText(REPO, { exact: true })
    .count();
  test.skip(
    already > 0,
    `${REPO} 는 이미 등록돼 있어 처음 등록을 잴 수 없습니다`,
  );

  const started = Date.now();
  const lap = (label: string) =>
    console.log(
      `[온보딩] ${label}: ${((Date.now() - started) / 1000).toFixed(1)}초`,
    );

  await page.goto("/projects/new", { waitUntil: "networkidle" });
  await page.getByLabel("공개 리포 주소").fill(`https://github.com/${REPO}`);
  await page
    .getByRole("button", { name: /등록|추가/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 90_000 });
  const projectUrl = page.url();
  lap("리포 등록");

  try {
    await page.getByRole("button", { name: "보안 점검 시작" }).click();
    await expect(page).toHaveURL(/\/scans\/[\w-]+$/);
    await expect(
      page.getByRole("heading", { name: "보안 점검 결과" }),
    ).toBeVisible({ timeout: 200_000 });
    const firstCopy = page
      .locator("li")
      .filter({ hasText: "SEC-" })
      .getByRole("button", { name: "복사" })
      .first();
    await expect(
      firstCopy.or(page.getByText("발견된 보안 문제가 없습니다")),
    ).toBeVisible({ timeout: 200_000 });
    lap("점검 완료");

    if (await firstCopy.isVisible()) {
      await firstCopy.click();
      await expect(
        page.getByRole("button", { name: "복사됨" }).first(),
      ).toBeVisible();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toMatch(/\[SEC-\d{3}\]/);
      lap("수정 프롬프트 복사");
    } else {
      lap("문제 없음(복사할 프롬프트 없음)");
    }
    expect(Date.now() - started).toBeLessThan(LIMIT_MS);
  } finally {
    await page.goto(projectUrl, { waitUntil: "networkidle" });
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "프로젝트 지우기" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  }
});
