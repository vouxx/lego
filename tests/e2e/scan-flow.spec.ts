import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "../../playwright.config";

/**
 * 로그인 → 프로젝트 → 스캔 → 결과 확인.
 * 준비: `pnpm e2e:login` 으로 세션 저장, E2E_PROJECT 에 점검할 리포(owner/name) 지정.
 * 실제 스캔은 비용(LLM)과 월 한도를 쓰므로 E2E_RUN_SCAN=1 일 때만 새로 돌리고,
 * 아니면 가장 최근 결과를 연다.
 */
const PROJECT = process.env.E2E_PROJECT ?? "vouxx/lego-sample-vuln";

test.skip(
  !existsSync(AUTH_STATE),
  "pnpm e2e:login 으로 세션을 먼저 저장하세요",
);

test("프로젝트를 점검하고 결과에서 수정 프롬프트를 확인한다", async ({
  page,
}) => {
  test.setTimeout(240_000);

  await page.goto("/projects");
  await page.getByRole("link", { name: PROJECT }).click();
  await expect(page.getByRole("heading", { name: PROJECT })).toBeVisible();

  if (process.env.E2E_RUN_SCAN === "1") {
    await page.getByRole("button", { name: "보안 점검 시작" }).click();
    await expect(page).toHaveURL(/\/scans\/[\w-]+$/);
    await expect(
      page.getByText(/문제|발견된 보안 문제가 없습니다/).first(),
    ).toBeVisible({
      timeout: 200_000,
    });
  } else {
    await page
      .getByRole("link", { name: /문제 \d+개/ })
      .first()
      .click();
  }

  await expect(
    page.getByRole("heading", { name: "보안 점검 결과" }),
  ).toBeVisible();
  const firstCard = page.locator("li").filter({ hasText: "SEC-" }).first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.getByRole("button", { name: /복사/ })).toBeVisible();

  // 무시 → 되돌리기 (상태만 바꾸고 원래대로 둔다)
  const card = page
    .locator("li")
    .filter({ has: page.getByRole("button", { name: "무시" }) })
    .first();
  await card.getByRole("button", { name: "무시" }).click();
  await expect(card.getByText("무시함")).toBeVisible();
  await card.getByRole("button", { name: "되돌리기" }).click();
  await expect(card.getByRole("button", { name: "무시" })).toBeVisible();
});
