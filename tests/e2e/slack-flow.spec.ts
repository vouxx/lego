import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: 사용자용 Slack 알림. Slack 은 모의 서버(SLACK_API_URL=http://localhost:4030)로 대신한다.
 * "Slack 에 추가" → (Slack 허용 화면 대신 바로 돌아옴) → 연결·확인 메시지 → 알림 설정 → 시험 메시지 → 연결 끊기.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const REPO = "e2e/slack-repo";
const MOCK = "http://localhost:4030";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");

const posts: { path: string; body: { text: string } }[] = [];
let exchanged: Record<string, string> = {};
let server: Server;
let projectId = "";
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const u = new URL(req.url ?? "/", MOCK);
      // 사용자가 Slack 화면에서 '허용'을 누른 것처럼 바로 돌려보낸다.
      if (u.pathname === "/oauth/v2/authorize") {
        const back = new URL(u.searchParams.get("redirect_uri")!);
        back.searchParams.set("code", "mock-code");
        back.searchParams.set("state", u.searchParams.get("state")!);
        res.writeHead(302, { location: back.toString() });
        return res.end();
      }
      if (u.pathname === "/api/oauth.v2.access") {
        exchanged = Object.fromEntries(new URLSearchParams(raw));
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(
          JSON.stringify({
            ok: true,
            team: { id: "T0E2E", name: "e2e-team" },
            incoming_webhook: {
              channel: "#lego-alerts",
              channel_id: "C0E2E",
              url: `${MOCK}/hook/e2e`,
            },
          }),
        );
      }
      if (u.pathname.startsWith("/hook/")) {
        posts.push({ path: u.pathname, body: JSON.parse(raw) });
        res.writeHead(200);
        return res.end("ok");
      }
      res.writeHead(404);
      res.end();
    });
  }).listen(4030);

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
});

test.afterAll(async () => {
  server?.close();
  await admin.from("projects").delete().eq("id", projectId);
});

test("Slack 에 추가하면 채널이 연결되고, 알림 설정·시험 메시지·연결 끊기를 할 수 있다", async ({
  page,
}) => {
  await page.goto(`/projects/${projectId}`, { waitUntil: "networkidle" });
  const section = page.getByRole("region", { name: "Slack 알림" });
  await section.getByRole("link", { name: "Slack 에 추가" }).click();

  await expect(page).toHaveURL(/slack=connected/);
  await expect(section.getByRole("status")).toContainText(
    "Slack 에 연결했습니다",
  );
  await expect(section).toContainText("#lego-alerts");
  await expect(section).toContainText("e2e-team");
  // 서버가 code 를 client secret 과 함께 바꿨고, 확인 메시지를 보냈다.
  expect(exchanged.code).toBe("mock-code");
  expect(exchanged.client_secret).toBe("local-test-secret");
  expect(posts.at(-1)?.body.text).toContain(`${REPO} 알림이 이 채널로 옵니다`);

  // webhook 주소는 사용자 세션으로 읽을 수 없다(서버 전용).
  const { data: row } = await admin
    .from("slack_connections")
    .select("webhook_url, notify_scan")
    .eq("project_id", projectId)
    .single();
  expect(row?.webhook_url).toBe(`${MOCK}/hook/e2e`);
  expect(row?.notify_scan).toBe(false);
  await expect(page.locator("body")).not.toContainText("/hook/e2e");

  await section.getByRole("checkbox", { name: /보안 점검/ }).check();
  await expect
    .poll(
      async () =>
        (
          await admin
            .from("slack_connections")
            .select("notify_scan")
            .eq("project_id", projectId)
            .single()
        ).data?.notify_scan,
    )
    .toBe(true);

  const before = posts.length;
  await section.getByRole("button", { name: "시험 메시지 보내기" }).click();
  await expect(section.getByText(/시험 메시지를 보냈습니다/)).toBeVisible();
  expect(posts.length).toBe(before + 1);

  page.once("dialog", (d) => d.accept());
  await section.getByRole("button", { name: "연결 끊기" }).click();
  await expect(
    section.getByRole("link", { name: "Slack 에 추가" }),
  ).toBeVisible();
});

test("state 가 맞지 않으면 연결하지 않는다", async ({ page }) => {
  await page.goto(`/api/slack/oauth/callback?code=x&state=forged`);
  await expect(page).toHaveURL(/\/projects/);
  const { count } = await admin
    .from("slack_connections")
    .select("project_id", { count: "exact", head: true })
    .eq("project_id", projectId);
  expect(count).toBe(0);
});
