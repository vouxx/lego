import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 스펙 변환기: 아이디어 → 확인 질문 → 생성(PRD·설계·작업·프롬프트) → 작업 보드.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 뒤에 돈다. Haiku 1회 + Sonnet 여러 번을 부른다.
 */
const SEED = "tests/e2e/.auth/local-project.json";
test.skip(!existsSync(SEED), "pnpm e2e:local-seed 를 먼저 실행해 주세요.");

test("아이디어로 스펙을 만들고 작업을 진행 중으로 옮긴다", async ({ page }) => {
  test.setTimeout(300_000);
  const { projectId } = JSON.parse(readFileSync(SEED, "utf8")) as {
    projectId: string;
  };

  await page.goto(`/specs/new?projectId=${projectId}`);
  await page.getByRole("button", { name: "팀 점심 메뉴 투표" }).click();
  await page.getByRole("button", { name: "다음: 확인 질문" }).click();

  await expect(page).toHaveURL(/\/specs\/[0-9a-f-]+$/, { timeout: 60_000 });
  const questions = page.locator("fieldset");
  await expect(questions.first()).toBeVisible();
  const count = await questions.count();
  expect(count).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < count; i++) {
    await questions.nth(i).getByRole("button").first().click();
  }
  await page.getByRole("button", { name: "스펙 만들기" }).click();
  await expect(page.getByLabel("생성 진행")).toBeVisible();

  const board = page.getByRole("tab", { name: /작업 \(\d+\)/ });
  await expect(board).toBeVisible({ timeout: 280_000 });
  await expect(page.getByText(/T-1/).first()).toBeVisible();

  // 선행 작업이 없는 첫 작업을 시작한다.
  const todo = page.getByRole("region", { name: "할 일" });
  await todo.getByRole("button", { name: "시작" }).first().click();
  await expect(
    page
      .getByRole("region", { name: "진행 중" })
      .getByText("T-1", { exact: true }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "PRD" }).click();
  await expect(page.getByRole("heading", { name: "목표" })).toBeVisible();
  await page.getByRole("tab", { name: "CLAUDE.md 초안" }).click();
  await expect(
    page.getByRole("heading", { name: "프로젝트 개요" }),
  ).toBeVisible();
});
