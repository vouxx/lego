import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: 주간 요약. 지난주 점검·PR 리뷰를 넣고 워커를 부르면 Slack 으로 한 번만 간다.
 * 주가 지나 같은 연결이 다시 대상이 돼도 조용한 주·끈 연결에는 보내지 않는다.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const REPO = "e2e/weekly-repo";
const QUIET_REPO = "e2e/weekly-quiet";
const OFF_REPO = "e2e/weekly-off";
const PORT = 4032;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");

const posts: { path: string; text: string }[] = [];
let server: Server;

const DAY = 24 * 60 * 60 * 1000;
const monday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.getTime();
};
const lastWeek = (days: number) =>
  new Date(monday() - days * DAY).toISOString();

async function project(userId: string, repo: string, hook: string, on = true) {
  await admin.from("projects").delete().eq("repo_full_name", repo);
  const { data } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      repo_full_name: repo,
      default_branch: "main",
      detected_stack: { tags: [], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  await admin.from("slack_connections").insert({
    project_id: data!.id,
    user_id: userId,
    team_id: "T",
    channel_id: "C",
    webhook_url: `http://localhost:${PORT}/hook/${hook}`,
    notify_weekly: on,
    last_weekly_at: lastWeek(10),
  });
  return data!.id as string;
}

test.beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      posts.push({
        path: req.url ?? "",
        text: JSON.stringify(JSON.parse(raw)),
      });
      res.writeHead(200);
      res.end("ok");
    });
  });
  await new Promise<void>((done) => server.listen(PORT, done));

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  if (!profile) throw new Error("pnpm e2e:local-seed 를 먼저 실행하세요.");
  const projectId = await project(profile.id, REPO, "busy");
  await project(profile.id, QUIET_REPO, "quiet");
  await project(profile.id, OFF_REPO, "off", false);

  const { data: scan } = await admin
    .from("scans")
    .insert({
      project_id: projectId,
      user_id: profile.id,
      status: "done",
      progress: 100,
      created_at: lastWeek(3),
    })
    .select("id")
    .single();
  const { data: rule } = await admin
    .from("rules")
    .select("id")
    .limit(1)
    .single();
  await admin.from("findings").insert({
    scan_id: scan!.id,
    user_id: profile.id,
    rule_id: rule!.id,
    severity: "high",
    file_path: "a.ts",
    line_start: 1,
    line_end: 1,
    snippet: "x",
    fingerprint: "fp-weekly",
  });
  await admin.from("pr_reviews").insert({
    project_id: projectId,
    user_id: profile.id,
    pr_number: 7,
    pr_title: "t",
    head_sha: "a".repeat(40),
    status: "done",
    summary: { conclusion: "failure" },
    created_at: lastWeek(2),
  });
});

test.afterAll(async () => {
  await new Promise((done) => server.close(done));
  await admin
    .from("projects")
    .delete()
    .in("repo_full_name", [REPO, QUIET_REPO, OFF_REPO]);
});

test("지난주 요약을 한 번만 보내고 조용한 주·끈 연결은 건너뛴다", async ({
  request,
}) => {
  const run = () =>
    request.post("/api/scan-worker?wait=1", {
      headers: {
        authorization: `Bearer ${process.env.SCAN_WORKER_SECRET}`,
      },
      timeout: 60_000,
    });

  expect((await run()).status()).toBe(200);
  const busy = posts.filter((p) => p.path === "/hook/busy");
  expect(busy).toHaveLength(1);
  expect(busy[0]!.text).toContain("e2e/weekly-repo");
  expect(busy[0]!.text).toContain("남은 문제 1개(치명·높음 1개)");
  expect(busy[0]!.text).toContain("PR 1개 중 0개 통과");
  expect(posts.some((p) => p.path === "/hook/quiet")).toBe(false);
  expect(posts.some((p) => p.path === "/hook/off")).toBe(false);

  await run();
  expect(posts.filter((p) => p.path === "/hook/busy")).toHaveLength(1);
});
