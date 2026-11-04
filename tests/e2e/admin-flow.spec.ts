import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: 관리자 오탐 피드백 화면. .env.local 의 ADMIN_USER_IDS 에 E2E 계정이 있어야 한다.
 * 같은 문제가 커밋마다 반복 저장돼도 한 건으로 세는지, /lego ignore 이유가 보이는지 확인한다.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const REPO = "e2e/feedback-repo";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");
const sha = () => randomBytes(20).toString("hex");
let projectId = "";

test.beforeAll(async () => {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  if (!profile) throw new Error("pnpm e2e:local-seed 를 먼저 실행하세요.");
  await admin.from("projects").delete().eq("repo_full_name", REPO);
  const { data: project } = await admin
    .from("projects")
    .insert({
      user_id: profile.id,
      repo_full_name: REPO,
      default_branch: "main",
      detected_stack: { tags: [], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  projectId = project!.id;
  // 같은 PR 의 커밋 두 개에 같은 문제(fingerprint)가 반복 저장된 상황 + 다른 문제 하나
  for (const [i, head] of [sha(), sha()].entries()) {
    const { data: review } = await admin
      .from("pr_reviews")
      .insert({
        project_id: projectId,
        user_id: profile.id,
        pr_number: 3,
        head_sha: head,
        status: "done",
      })
      .select("id")
      .single();
    const base = {
      review_id: review!.id,
      user_id: profile.id,
      rule_id: "PR-902",
      rule_title: "피드백 테스트 규칙",
      severity: "medium",
      reason: "테스트",
    };
    const { error: e1 } = await admin.from("pr_review_findings").insert({
      ...base,
      file_path: "src/a.ts",
      line: 3,
      fingerprint: "fb-e2e-1",
      state: "ignored",
      ignore_reason: "테스트 픽스처라 괜찮음",
      ignored_by: "vouxx",
    });
    if (e1) throw new Error(e1.message);
    if (i === 1) {
      const { error: e2 } = await admin.from("pr_review_findings").insert({
        ...base,
        file_path: "src/b.ts",
        line: 9,
        fingerprint: "fb-e2e-2",
        ai_verdict: "true_positive",
      });
      if (e2) throw new Error(e2.message);
    }
  }
});

test.afterAll(async () => {
  await admin.from("projects").delete().eq("id", projectId);
});

test("관리자는 규칙별 잡음 비율과 무시한 이유를 본다", async ({ page }) => {
  await page.goto("/guard", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "관리" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "오탐 피드백" }),
  ).toBeVisible();

  // 반복 저장된 같은 문제는 한 건: 발견 2, 무시 1 → 50%
  const row = page.getByRole("row").filter({ hasText: "PR-902" });
  await expect(row.getByRole("cell").nth(0)).toHaveText("2");
  await expect(row.getByRole("cell").nth(3)).toHaveText("1");
  await expect(row).toContainText("50%");
  await expect(page.getByText("“테스트 픽스처라 괜찮음”")).toHaveCount(1);
});
