import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** 로컬 전용: 프로젝트 화면의 보안 추이(점검 3번: 남은 문제 3 → 2 → 1). */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const REPO = "e2e/trend-repo";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");
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
  const plan = [
    { at: "2026-10-20T09:00:00Z", fps: ["a", "b", "c"] },
    { at: "2026-10-24T09:00:00Z", fps: ["b", "c"] },
    { at: "2026-10-30T09:00:00Z", fps: ["c"] },
  ];
  for (const step of plan) {
    const { data: scan } = await admin
      .from("scans")
      .insert({
        project_id: projectId,
        user_id: profile.id,
        status: "done",
        progress: 100,
        created_at: step.at,
        finished_at: step.at,
      })
      .select("id")
      .single();
    const { error } = await admin.from("findings").insert(
      step.fps.map((fp) => ({
        scan_id: scan!.id,
        user_id: profile.id,
        rule_id: "SEC-001",
        severity: fp === "c" ? "low" : "critical",
        file_path: `src/${fp}.ts`,
        line_start: 1,
        line_end: 1,
        snippet: "",
        fingerprint: `trend-${fp}`,
        ai_verdict: "true_positive",
      })),
    );
    if (error) throw new Error(error.message);
  }
});

test.afterAll(async () => {
  await admin.from("projects").delete().eq("id", projectId);
});

test("프로젝트 화면에서 남은 문제 추이와 해결 시간을 본다", async ({
  page,
}) => {
  await page.goto(`/projects/${projectId}`, { waitUntil: "networkidle" });
  const section = page.getByRole("region", { name: "보안 추이" });
  await expect(section).toBeVisible();
  await expect(section).toContainText("지금 남은 문제");
  await expect(section).toContainText("지난 점검보다 1개 줄었음");
  // a: 10/20 → 10/24 (4일), b: 10/20 → 10/30 (10일) → 중앙값 7일
  await expect(section).toContainText("7일");
  await expect(section.getByRole("img")).toHaveAttribute(
    "aria-label",
    /점검 3번의 남은 문제 수/,
  );

  // 오른쪽 끝(마지막 점검)에 올리면 그 점검의 숫자가 뜬다.
  const chart = section.getByRole("img");
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await expect(async () => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width - 14, box.y + box.height / 2, {
      steps: 4,
    });
    await expect(section.getByRole("status")).toContainText("남은 문제 1개", {
      timeout: 1000,
    });
  }).toPass({ timeout: 15_000 });

  await section.getByText("표로 보기").click();
  await expect(section.getByRole("table").getByRole("row")).toHaveCount(4);
});
