import { expect, test, type Page } from "@playwright/test";

/**
 * 운영 점검용. 로그인한 실제 계정으로 2~5단계를 한 번씩 돌린다.
 *   E2E_BASE_URL=https://vouxx-lego.vercel.app E2E_AUTH_FILE=tests/e2e/.auth/prod.json pnpm e2e:login
 *   E2E_BASE_URL=https://vouxx-lego.vercel.app pnpm e2e --project=prod-signed-in
 *
 * 테스트가 만든 것(스펙·임시 프로젝트)은 끝에 지운다. 기존 프로젝트는 지우지 않는다.
 * 규칙 파일은 ZEEK 에 만들어 둔 채로 남긴다. AI 비용은 한 번에 약 $0.3.
 */
const RULE_REPO = "vouxx/ZEEK";
const TEMP_REPO = "https://github.com/vouxx/vouxx.github.io";

test.describe.configure({ mode: "serial" });

async function openProject(page: Page, repo: string) {
  await page.goto("/projects", { waitUntil: "networkidle" });
  await page
    .getByRole("main")
    .getByRole("link", { name: new RegExp(repo) })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(repo);
}

async function deleteHere(page: Page, button: string, back: RegExp) {
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL(back);
}

test("규칙 파일: 만들고, 규칙을 끄고, 저장한다", async ({ page }) => {
  test.setTimeout(150_000);
  await openProject(page, RULE_REPO);
  await page.getByRole("link", { name: "AI 규칙 파일 열기 →" }).click();
  const make = page.getByRole("button", { name: "CLAUDE.md 만들기" });
  const editor = page.getByRole("textbox", { name: /CLAUDE\.md 편집/ });
  // 처음이면 만들기 버튼, 이미 있으면 에디터가 뜬다. 화면이 다 뜬 뒤에 고른다.
  await expect(make.or(editor)).toBeVisible();
  if (await make.isVisible()) await make.click();
  await expect(editor).toHaveValue(/## 기술 스택/, { timeout: 120_000 });
  await expect(editor).toHaveValue(/## 폴더 구조/);

  const rule = page.getByRole("checkbox").first();
  const wasChecked = await rule.isChecked();
  await rule.setChecked(!wasChecked);
  await expect(page.getByText("저장하지 않은 변경 있음")).toBeVisible();
  await page.getByRole("button", { name: "새 버전으로 저장" }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();
  await expect(page.getByText(/PR 대신 내려받기/)).toBeVisible();
});

test("점검 결과의 '이게 뭐예요?'가 규칙과 연결된 개념 페이지로 간다", async ({
  page,
}) => {
  await openProject(page, RULE_REPO);
  await page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ hasText: "완료" })
    .first()
    .getByRole("link")
    .click();
  await page.getByRole("link", { name: "이게 뭐예요? →" }).first().click();
  await expect(page).toHaveURL(/\/concepts\/[a-z0-9-]+$/);
  await expect(
    page.getByRole("heading", {
      name: "레고 보안 점검에서 이 개념과 관련된 규칙",
    }),
  ).toBeVisible();
});

test("스펙: 아이디어로 작업까지 만든 뒤 지운다", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto("/specs/new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "팀 점심 메뉴 투표" }).click();
  await page.getByRole("button", { name: "다음: 확인 질문" }).click();
  await expect(page).toHaveURL(/\/specs\/[0-9a-f-]+$/, { timeout: 60_000 });
  const questions = page.getByRole("main").locator("fieldset");
  await expect(questions.first()).toBeVisible();
  const count = await questions.count();
  for (let i = 0; i < count; i++)
    await questions.nth(i).getByRole("button").first().click();
  await page.getByRole("button", { name: "스펙 만들기" }).click();
  await expect(page.getByRole("tab", { name: /작업 \(\d+\)/ })).toBeVisible({
    timeout: 280_000,
  });
  await expect(page.getByText("T-1", { exact: true }).first()).toBeVisible();
  await deleteHere(page, "스펙 지우기", /\/specs$/);
});

test("프로젝트: 공개 리포를 주소로 등록한 뒤 지운다", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/projects/new", { waitUntil: "networkidle" });
  await page.getByLabel("공개 리포 주소").fill(TEMP_REPO);
  await page
    .getByRole("button", { name: /등록|추가/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/, { timeout: 90_000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "vouxx.github.io",
  );
  await deleteHere(page, "프로젝트 지우기", /\/projects$/);
  await expect(
    page.getByRole("main").getByText("vouxx/vouxx.github.io"),
  ).toHaveCount(0);
});

test("메뉴의 PR 가드·운영 점검 화면이 열린다", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "주 메뉴" });
  await page.goto("/projects", { waitUntil: "networkidle" });
  await nav.getByRole("link", { name: "PR 가드" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "PR 가드" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "프로젝트별 설정" }),
  ).toBeVisible();
  await nav.getByRole("link", { name: "운영 점검" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "운영 점검" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(RULE_REPO)).toBeVisible();
});
