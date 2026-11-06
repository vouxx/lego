import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test, type Browser } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: 팀 멤버 초대. 소유자(lego-e2e)가 링크를 만들고 lego-e2e-guest 가 수락한다.
 * 멤버는 결과만 보고, 쓰기는 소유자만 된다는 것을 화면과 멤버 세션의 RLS 로 확인한다.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");
test.describe.configure({ mode: "serial" });

// Suspense 안의 notFound() 는 스트리밍이라 상태 코드가 200 이다.
const NOT_FOUND = "This page could not be found";
const REPO = "e2e/members-repo";
const EMAIL = "e2e-guest@lego.test";
const LOGIN = "lego-e2e-guest";
const auth = createClient(url, secretKey, { auth: { persistSession: false } });
const admin = auth.schema("lego");

let projectId = "";
let scanId = "";
let findingId = "";
let inviteUrl = "";
let guestId = "";
let guestPassword = "";
let cookies: { name: string; value: string }[] = [];

async function guestContext(browser: Browser) {
  const context = await browser.newContext({ storageState: undefined });
  await context.addCookies(
    cookies.map((c) => ({
      ...c,
      domain: "localhost",
      path: "/",
      sameSite: "Lax" as const,
    })),
  );
  return context;
}

test.beforeAll(async () => {
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  if (!owner) throw new Error("pnpm e2e:local-seed 를 먼저 실행하세요.");

  guestPassword = randomBytes(24).toString("base64url");
  const metadata = { user_name: LOGIN, provider_id: "990000002" };
  const { data: list } = await auth.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  const guest = existing
    ? (
        await auth.auth.admin.updateUserById(existing.id, {
          password: guestPassword,
          user_metadata: metadata,
        })
      ).data.user
    : (
        await auth.auth.admin.createUser({
          email: EMAIL,
          password: guestPassword,
          email_confirm: true,
          user_metadata: metadata,
        })
      ).data.user;
  guestId = guest!.id;
  await admin.from("profiles").upsert({ id: guestId, github_login: LOGIN });

  const ssr = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => [],
      setAll: (items) => {
        cookies.push(...items);
      },
    },
  });
  cookies = [];
  await ssr.auth.signInWithPassword({ email: EMAIL, password: guestPassword });

  await admin.from("projects").delete().eq("repo_full_name", REPO);
  const { data: project } = await admin
    .from("projects")
    .insert({
      user_id: owner.id,
      repo_full_name: REPO,
      default_branch: "main",
      detected_stack: { tags: [], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  projectId = project!.id;
  const { data: scan } = await admin
    .from("scans")
    .insert({
      project_id: projectId,
      user_id: owner.id,
      status: "done",
      progress: 100,
    })
    .select("id")
    .single();
  scanId = scan!.id;
  const { data: rule } = await admin
    .from("rules")
    .select("id, title")
    .limit(1)
    .single();
  const { data: finding } = await admin
    .from("findings")
    .insert({
      scan_id: scanId,
      user_id: owner.id,
      rule_id: rule!.id,
      severity: "high",
      file_path: "src/shared.ts",
      line_start: 1,
      line_end: 1,
      snippet: "x",
      fingerprint: "fp-members",
    })
    .select("id")
    .single();
  findingId = finding!.id;
});

test.afterAll(async () => {
  await admin.from("projects").delete().eq("repo_full_name", REPO);
});

test("소유자가 GitHub 아이디로 초대 링크를 만든다", async ({ page }) => {
  await page.goto(`/projects/${projectId}`);
  const section = page.getByRole("region", { name: "팀 멤버" });
  await section.getByLabel("초대할 GitHub 아이디").fill(`@${LOGIN}`);
  await section.getByRole("button", { name: "초대 링크 만들기" }).click();
  const code = section.getByRole("status").locator("code");
  await expect(code).toContainText("/invites/");
  inviteUrl = (await code.textContent())!;
  await expect(section.getByRole("list", { name: "멤버 목록" })).toContainText(
    "수락 대기",
  );

  const { data } = await admin
    .from("project_invites")
    .select("token_hash")
    .eq("project_id", projectId)
    .single();
  expect(inviteUrl).not.toContain(data!.token_hash);

  // 초대받지 않은 계정에게는 리포 이름을 보여 주지 않는다.
  await page.goto(inviteUrl);
  await expect(
    page.getByText(`이 초대는 @${LOGIN} 계정용입니다`),
  ).toBeVisible();
  await expect(page.getByText(REPO)).toHaveCount(0);
});

test("초대받은 계정이 수락하면 결과를 보기만 한다", async ({ browser }) => {
  const context = await guestContext(browser);
  const page = await context.newPage();

  // 멤버가 되기 전에는 프로젝트를 볼 수 없다.
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByText(NOT_FOUND)).toBeVisible();

  await page.goto(inviteUrl);
  await expect(page.getByText(REPO)).toBeVisible();
  await page.getByRole("button", { name: "초대 수락" }).click();
  await page.waitForURL(`**/projects/${projectId}`);

  await expect(page.getByText("보기 전용")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "프로젝트 지우기" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Slack 알림" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "팀 멤버" })).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);

  await page.goto(`/projects/${projectId}/scans/${scanId}`);
  await expect(page.getByText("src/shared.ts:1")).toBeVisible();
  await expect(page.getByRole("button", { name: /무시/ })).toHaveCount(0);

  // 규칙 파일은 소유자 전용이다.
  await page.goto(`/projects/${projectId}/context`);
  await expect(page.getByText(NOT_FOUND)).toBeVisible();

  await page.goto("/projects");
  await expect(
    page.getByRole("region", { name: "초대받은 프로젝트" }),
  ).toContainText(REPO);

  // 같은 링크는 다시 쓸 수 없다.
  await page.goto(inviteUrl);
  await expect(page.getByText("만료됐거나 이미 쓴 초대입니다")).toBeVisible();
  await context.close();
});

test("멤버 세션은 RLS 로도 프로젝트 쓰기 경로에 닿지 못한다", async () => {
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false },
    db: { schema: "lego" },
  });
  await client.auth.signInWithPassword({
    email: EMAIL,
    password: guestPassword,
  });

  // 소유 확인이 RLS 로 projects 를 읽으므로, 여기가 비어 있어야 멤버가 쓰기를 못 한다.
  const { data: projects } = await client
    .from("projects")
    .select("id")
    .eq("id", projectId);
  expect(projects).toEqual([]);

  const { data: findings } = await client
    .from("findings")
    .select("id")
    .eq("id", findingId);
  expect(findings).toHaveLength(1);
  const { data: updated } = await client
    .from("findings")
    .update({ status: "ignored" })
    .eq("id", findingId)
    .select("id");
  expect(updated).toEqual([]);

  const { data: invites } = await client
    .from("project_invites")
    .select("id")
    .eq("project_id", projectId);
  expect(invites).toEqual([]);
  const { data: slack } = await client
    .from("slack_connections")
    .select("project_id")
    .eq("project_id", projectId);
  expect(slack).toEqual([]);
  const { error } = await client.rpc("accept_project_invite", {
    p_token_hash: "x",
    p_user_id: guestId,
    p_login: LOGIN,
    p_avatar: "",
  });
  expect(error).not.toBeNull();
});

test("소유자가 내보내면 바로 볼 수 없다", async ({ page, browser }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(`/projects/${projectId}`);
  const section = page.getByRole("region", { name: "팀 멤버" });
  await expect(section.getByText(`@${LOGIN}`)).toBeVisible();
  await section.getByRole("button", { name: "내보내기" }).click();
  await expect(section.getByText(`@${LOGIN}`)).toHaveCount(0);

  const context = await guestContext(browser);
  const guest = await context.newPage();
  await guest.goto(`/projects/${projectId}/scans/${scanId}`);
  await expect(guest.getByText(NOT_FOUND)).toBeVisible();
  await context.close();
});
