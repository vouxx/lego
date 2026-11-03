import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * 사용자가 만든 것을 지울 수 있다: 학습 설명, 프로젝트.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 뒤에 돈다. 프로젝트를 지우므로 끝나면 다시 시드해야 한다.
 */
const SEED = "tests/e2e/.auth/local-project.json";
test.skip(!existsSync(SEED), "pnpm e2e:local-seed 를 먼저 실행해 주세요.");
test.describe.configure({ mode: "serial" });

test("학습 설명을 지우면 목록에서 사라진다", async ({ page }) => {
  test.setTimeout(120_000);
  // 학습 E2E 와 같은 코드라 캐시에서 바로 나온다(LLM 호출 없음).
  await page.goto("/learn");
  await page.getByLabel("설명할 코드")
    .fill(`export async function POST(req: Request) {
  const { userId, title } = await req.json();
  const { data } = await supabase.from("posts").insert({ user_id: userId, title });
  return Response.json(data);
}`);
  await page.getByRole("button", { name: "설명해 줘" }).click();
  await expect(page).toHaveURL(/\/learn\/[0-9a-f-]+$/, { timeout: 90_000 });
  const url = page.url();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "설명 지우기" }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto(url);
  await expect(
    page.getByText(/could not be found|찾을 수 없/i).first(),
  ).toBeVisible();
});

test("스펙을 지우면 목록에서 줄어든다", async ({ page }) => {
  await page.goto("/specs", { waitUntil: "networkidle" });
  const rows = page.getByRole("main").getByRole("listitem");
  const before = await rows.count();
  test.skip(
    before === 0,
    "지울 스펙이 없습니다(스펙 E2E 를 먼저 돌려 주세요).",
  );
  await rows.first().getByRole("link").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "스펙 지우기" }).click();
  await expect(page).toHaveURL(/\/specs$/);
  await expect(rows).toHaveCount(before - 1);
});

test("프로젝트를 지우면 목록에서 사라진다", async ({ page }) => {
  const { projectId, repo } = JSON.parse(readFileSync(SEED, "utf8")) as {
    projectId: string;
    repo: string;
  };
  await page.goto(`/projects/${projectId}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "프로젝트 지우기" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("main").getByText(repo)).toHaveCount(0);
});
