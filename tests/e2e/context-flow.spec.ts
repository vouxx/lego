import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 컨텍스트 생성기: 생성 → 규칙 끄기 → 저장 → 버전 비교.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 로 세션과 프로젝트를 만든 뒤 돈다(폴더 요약에 Haiku 를 한 번 부른다).
 */
const SEED = "tests/e2e/.auth/local-project.json";
const seed = existsSync(SEED)
  ? (JSON.parse(readFileSync(SEED, "utf8")) as { projectId: string })
  : null;

test.skip(!seed, "pnpm e2e:local-seed 를 먼저 실행해 주세요.");

test("규칙 파일을 만들고, 규칙을 끄고, 새 버전으로 저장한다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(`/projects/${seed!.projectId}/context`);

  await page.getByRole("button", { name: "CLAUDE.md 만들기" }).click();
  const editor = page.getByRole("textbox", { name: /CLAUDE\.md 편집/ });
  await expect(editor).toHaveValue(/^# 프로젝트 규칙/, { timeout: 90_000 });
  await expect(editor).toHaveValue(/## 기술 스택/);
  await expect(editor).toHaveValue(/## 폴더 구조/);

  // 공통 규칙 하나를 끄면 문서에서 빠진다.
  const rule = "한 번에 한 가지 변경만 하고, 관련 없는 파일은 고치지 않는다.";
  await expect(editor).toHaveValue(new RegExp(rule));
  await page.getByRole("checkbox", { name: new RegExp(rule) }).uncheck();
  await expect(editor).not.toHaveValue(new RegExp(rule));
  await expect(page.getByText("저장하지 않은 변경 있음")).toBeVisible();

  // 비교 탭에서 빠진 줄이 보인다.
  await page.getByRole("tab", { name: "변경 비교" }).click();
  await expect(page.getByText(`- - ${rule}`)).toBeVisible();

  await page.getByRole("button", { name: "새 버전으로 저장" }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  await expect(page.getByText("버전 기록 (2)")).toBeVisible();

  // 주소로 등록한 공개 리포는 PR 대신 내려받기 안내.
  await expect(page.getByText(/PR 대신 내려받기/)).toBeVisible();
});

test("다른 대상 파일 탭으로 옮겨 갈 수 있다", async ({ page }) => {
  await page.goto(`/projects/${seed!.projectId}/context`);
  await page.getByRole("link", { name: /AGENTS\.md/ }).click();
  await expect(page).toHaveURL(/target=agents_md/);
  await expect(
    page.getByRole("button", { name: "AGENTS.md 만들기" }),
  ).toBeVisible();
});
