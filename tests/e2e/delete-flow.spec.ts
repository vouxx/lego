import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 사용자가 만든 것을 지울 수 있다: 스펙, 프로젝트.
 * 로컬 Supabase 에서 `pnpm e2e:local-seed` 뒤에 돈다.
 * 시드 프로젝트는 다른 E2E 가 쓰므로 지우지 않고, 지울 프로젝트를 따로 만든다.
 */
const SEED = "tests/e2e/.auth/local-project.json";
test.skip(!existsSync(SEED), "pnpm e2e:local-seed 를 먼저 실행해 주세요.");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const DOOMED = "e2e/delete-me";
test.describe.configure({ mode: "serial" });

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
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SECRET_KEY ?? "",
    { auth: { persistSession: false } },
  ).schema("lego");
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  await admin.from("projects").delete().eq("repo_full_name", DOOMED);
  const { data: project } = await admin
    .from("projects")
    .insert({
      user_id: profile!.id,
      repo_full_name: DOOMED,
      default_branch: "main",
      detected_stack: { tags: [], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  const repo = DOOMED;
  await page.goto(`/projects/${project!.id}`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "프로젝트 지우기" }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole("main").getByText(repo)).toHaveCount(0);
});
