import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 학습 도우미: 코드 붙여넣기 → 설명 → 퀴즈 채점 → 숙련도.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 뒤에 돈다. Sonnet 을 한 번 부른다(같은 코드는 캐시).
 */
test.skip(
  !existsSync("tests/e2e/.auth/local-project.json"),
  "pnpm e2e:local-seed 를 먼저 실행해 주세요.",
);

const CODE = `export async function POST(req: Request) {
  const { userId, title } = await req.json();
  const { data } = await supabase.from("posts").insert({ user_id: userId, title });
  return Response.json(data);
}`;

test("코드를 설명받고 퀴즈를 풀면 숙련도가 기록된다", async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto("/learn");
  await page.getByLabel("설명할 코드").fill(CODE);
  await page.getByLabel("초급").check();
  await page.getByRole("button", { name: "설명해 줘" }).click();

  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]+$/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "흐름" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "이해했는지 확인" }),
  ).toBeVisible();
  // 흐름도는 그려지거나(재시도 후에도 실패하면) 숨겨진다.
  await expect(page.getByText("흐름도를 그리는 중…")).toBeHidden({
    timeout: 30_000,
  });

  const questions = page
    .getByRole("region", { name: "퀴즈" })
    .locator("fieldset");
  const count = await questions.count();
  for (let i = 0; i < count; i++) {
    await questions.nth(i).getByRole("radio").first().check();
  }
  await page.getByRole("button", { name: "채점하기" }).click();
  await expect(page.getByText(/\d\/\d 맞힘/)).toBeVisible();

  await page.goto("/learn");
  await expect(page.getByRole("meter").first()).toBeVisible();
});

test("개념 사전은 로그인 없이 볼 수 있고 보안 규칙과 연결된다", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await page.goto("/concepts");
  await page.getByRole("link", { name: "RLS (Row Level Security)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "RLS (Row Level Security)",
  );
  await expect(page.getByText("SEC-005", { exact: true })).toBeVisible();
  await context.close();
});
