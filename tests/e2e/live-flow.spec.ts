import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: 운영 상태 점검. 일부러 취약하게 배포한 가짜 사이트(localhost:4020)와 로컬 Supabase 로 돌린다.
 * - JS 번들에 Supabase 주소·공개 키와 Stripe 비밀 키가 들어 있다.
 * - public.e2e_live_orders 는 RLS 가 꺼져 있어 anon 으로 행이 읽힌다(RLS 를 켠 e2e_live_safe 는 안 읽힌다).
 * - /.env 가 열려 있고 보안 헤더가 없다.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const SITE_PORT = 4020;
const SITE = `http://localhost:${SITE_PORT}`;
const FAKE_STRIPE = "sk_" + "live_" + "Qm7".repeat(9);
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");

let server: Server;
let verifyToken = "";
let projectId = "";
let seedRepo = "";

const psql = (sql: string) => {
  const container = execSync("docker ps --format '{{.Names}}'")
    .toString()
    .split("\n")
    .find((n) => n.startsWith("supabase_db"))!;
  execSync(`docker exec -i ${container} psql -U postgres -q`, { input: sql });
};

function startSite() {
  server = createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    if (path === "/.well-known/lego-verify.txt") {
      res.writeHead(verifyToken ? 200 : 404, { "content-type": "text/plain" });
      return res.end(verifyToken);
    }
    if (path === "/.env") {
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end("DATABASE_URL=postgres://user:pw@db/app\n");
    }
    if (path === "/static/app.js") {
      res.writeHead(200, { "content-type": "application/javascript" });
      return res.end(
        `const sb=createClient("${url}","${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}");\nconst stripe="${FAKE_STRIPE}";`,
      );
    }
    if (path === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(
        `<!doctype html><html><body><div id="app"></div><script src="/static/app.js"></script></body></html>`,
      );
    }
    // SPA 처럼 모든 주소에 HTML 로 답한다(.git/config 같은 오탐을 거르는지 본다).
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><html><body>not here</body></html>");
  });
  return new Promise<void>((resolve) => server.listen(SITE_PORT, resolve));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await startSite();
  psql(`
    drop table if exists public.e2e_live_orders, public.e2e_live_safe;
    create table public.e2e_live_orders (id int primary key, email text);
    insert into public.e2e_live_orders values (1, 'a@example.com'), (2, 'b@example.com');
    grant select on public.e2e_live_orders to anon;
    create table public.e2e_live_safe (id int primary key);
    alter table public.e2e_live_safe enable row level security;
    insert into public.e2e_live_safe values (1);
    grant select on public.e2e_live_safe to anon;
    notify pgrst, 'reload schema';
  `);
  const seed = JSON.parse(
    (await import("node:fs")).readFileSync(
      "tests/e2e/.auth/local-project.json",
      "utf8",
    ),
  ) as { projectId: string; repo: string };
  projectId = seed.projectId;
  seedRepo = seed.repo;
  await admin.from("live_targets").delete().eq("project_id", projectId);
});

test.afterAll(async () => {
  server?.close();
  await admin.from("live_targets").delete().eq("project_id", projectId);
  psql(
    "drop table if exists public.e2e_live_orders, public.e2e_live_safe; notify pgrst, 'reload schema';",
  );
});

test("소유 확인 전에는 점검할 수 없고, 토큰 파일을 올리면 확인된다", async ({
  page,
}) => {
  // 메뉴 → 운영 점검 → 프로젝트 줄 → 프로젝트의 운영 점검 화면
  await page.goto("/specs", { waitUntil: "networkidle" });
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "운영 점검" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "운영 점검" }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: /주소 등록 →/ })
    .filter({ hasText: seedRepo })
    .click();
  await expect(
    page.getByRole("heading", { name: "운영 상태 점검" }),
  ).toBeVisible();

  await page.getByLabel("배포 주소").fill(SITE);
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByRole("heading", { name: "소유 확인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "지금 점검" })).toHaveCount(0);

  // 파일을 올리기 전에 확인하면 실패한다.
  await page.getByRole("button", { name: "배포했어요, 확인하기" }).click();
  await expect(page.getByText(/확인 토큰을 찾지 못했습니다/)).toBeVisible();

  const { data: target } = await admin
    .from("live_targets")
    .select("verify_token")
    .eq("project_id", projectId)
    .single();
  verifyToken = target!.verify_token;
  await expect(page.getByText(verifyToken)).toBeVisible();
  await page.getByRole("button", { name: "배포했어요, 확인하기" }).click();
  await expect(page.getByRole("button", { name: "지금 점검" })).toBeVisible();
});

test("점검하면 밖에서 보이는 문제를 찾고, 응답 내용은 저장하지 않는다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto(`/projects/${projectId}/live`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "지금 점검" }).click();
  await expect(page.getByRole("heading", { name: /문제 \d+개/ })).toBeVisible({
    timeout: 90_000,
  });

  const { data: check } = await admin
    .from("live_checks")
    .select("results, summary")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  const results = check!.results as {
    id: string;
    target: string;
    severity: string;
    detail: string;
  }[];
  const found = results.map((r) => `${r.id}:${r.target}`);
  expect(found).toEqual(
    expect.arrayContaining([
      "LIVE-001:e2e_live_orders",
      "LIVE-003:/static/app.js",
      "LIVE-005:/.env",
      "LIVE-007:auth/v1/settings",
    ]),
  );
  expect(found).not.toContain("LIVE-001:e2e_live_safe");
  expect(found.some((f) => f.startsWith("LIVE-005:/.git"))).toBe(false);
  // 행 내용·키 원문은 저장하지 않는다.
  const stored = JSON.stringify(check);
  expect(stored).not.toContain("a@example.com");
  expect(stored).not.toContain(FAKE_STRIPE);
  expect(results.find((r) => r.id === "LIVE-001")?.severity).toBe("critical");

  await expect(
    page.getByText("로그인 없이 읽히는 테이블").first(),
  ).toBeVisible();
  await expect(
    page.getByText("배포된 JS 에 들어 있는 비밀 키").first(),
  ).toBeVisible();
  await expect(page.getByText(FAKE_STRIPE)).toHaveCount(0);
});

test("고친 뒤 다시 점검하면 사라지고, 새로 생긴 문제는 표시된다", async ({
  page,
}) => {
  test.setTimeout(120_000);
  psql(`
    alter table public.e2e_live_orders enable row level security;
    create table if not exists public.e2e_live_messages (id int primary key);
    insert into public.e2e_live_messages values (1) on conflict do nothing;
    grant select on public.e2e_live_messages to anon;
    notify pgrst, 'reload schema';
  `);
  // 2분 간격 제한을 테스트에서는 건너뛴다.
  await admin
    .from("live_targets")
    .update({ last_checked_at: null })
    .eq("project_id", projectId);
  // openapi 목록에 새 테이블이 보이도록 잠깐 기다린다.
  await new Promise((r) => setTimeout(r, 1500));

  await page.goto(`/projects/${projectId}/live`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "지금 점검" }).click();
  await expect(
    page.getByRole("heading", { name: /새로 생김 \d+개/ }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("e2e_live_orders", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("e2e_live_messages", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "점검 기록" })).toBeVisible();

  // 운영 점검 메뉴에서도 새로 생긴 문제가 보인다.
  await page.goto("/live", { waitUntil: "networkidle" });
  await expect(page.getByText(/새로 생김 \d+/)).toBeVisible();
  await page.goto(`/projects/${projectId}/live`, { waitUntil: "networkidle" });

  // 바로 다시 누르면 간격 제한에 걸린다.
  await page.getByRole("button", { name: "지금 점검" }).click();
  await expect(page.getByText(/2분에 한 번/)).toBeVisible();
  psql(
    "drop table if exists public.e2e_live_messages; notify pgrst, 'reload schema';",
  );
});
