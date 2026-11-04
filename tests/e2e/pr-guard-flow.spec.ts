import { createHmac, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: PR 가드 전체 흐름. GitHub API 는 모의 서버(GITHUB_API_URL=http://localhost:4010)로 대신한다.
 *   GITHUB_API_URL=http://localhost:4010 pnpm dev  (개발 서버를 이 값으로 띄워야 한다)
 * pull_request webhook → 바뀐 파일 읽기 → 규칙 → AI 판별 → 상태 체크·리뷰 코멘트 게시 → 레고 화면.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const MOCK_PORT = 4010;
const INSTALLATION = 990_002;
const REPO = "e2e/guard-repo";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");

const sha = () => randomBytes(20).toString("hex");
const asNewFile = (content: string) =>
  `@@ -0,0 +1,${content.split("\n").length} @@\n` +
  content
    .split("\n")
    .map((l) => `+${l}`)
    .join("\n");

const ROUTE = [
  `export async function POST(req: Request) {`,
  `  const { url } = await req.json();`,
  `  const html = await fetch(url).then((r) => r.text());`,
  `  return Response.json({ html });`,
  `}`,
].join("\n");
const PAY = [
  `export function charge(amount: number) {`,
  `  // @ts-ignore`,
  `  const key = process.env.RESEND_API_KEY;`,
  `  return send(key, amount);`,
  `}`,
].join("\n");
const PR_FILES = [
  {
    filename: "app/api/preview/route.ts",
    status: "added",
    patch: asNewFile(ROUTE),
  },
  {
    filename: "src/lib/pay.ts",
    status: "modified",
    patch: [
      "@@ -1,3 +1,5 @@",
      " export function charge(amount: number) {",
      "+  // @ts-ignore",
      "+  const key = process.env.RESEND_API_KEY;",
      "   return send(key, amount);",
      " }",
    ].join("\n"),
  },
  {
    filename: "package.json",
    status: "modified",
    patch: [
      "@@ -3,2 +3,3 @@",
      '   "dependencies": {',
      '+    "raect": "^19.0.0",',
      '     "zod": "^4.0.0"',
    ].join("\n"),
  },
  { filename: "src/auth.test.ts", status: "removed" },
];
const CONTENTS: Record<string, string> = {
  "app/api/preview/route.ts": ROUTE,
  "src/lib/pay.ts": PAY,
  "package.json": `{\n  "name": "x",\n  "dependencies": {\n    "raect": "^19.0.0",\n    "zod": "^4.0.0"\n  }\n}`,
  ".env.example": "NEXT_PUBLIC_SUPABASE_URL=\n",
};

type Recorded = { method: string; path: string; body: Record<string, unknown> };
const calls: Recorded[] = [];
let denyReviews = false;
let server: Server;

function startMock() {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const path = (req.url ?? "").split("?")[0]!;
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      calls.push({ method: req.method ?? "", path, body });
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (/^\/app\/installations\/\d+\/access_tokens$/.test(path))
        return send(201, {
          token: "ghs_mock",
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          permissions: {},
        });
      if (path === `/repos/${REPO}/pulls/7/files`) return send(200, PR_FILES);
      const content = path.match(new RegExp(`^/repos/${REPO}/contents/(.+)$`));
      if (content) {
        const text = CONTENTS[decodeURIComponent(content[1]!)];
        return text === undefined
          ? send(404, { message: "Not Found" })
          : send(200, {
              type: "file",
              size: text.length,
              content: Buffer.from(text).toString("base64"),
            });
      }
      if (path === `/repos/${REPO}/check-runs`) return send(201, { id: 77 });
      if (path === `/repos/${REPO}/check-runs/77`) return send(200, { id: 77 });
      if (path === `/repos/${REPO}/pulls/7/reviews`)
        return denyReviews
          ? send(403, { message: "Resource not accessible by integration" })
          : send(200, { id: 88 });
      send(404, { message: `mock: ${req.method} ${path}` });
    });
  });
  return new Promise<void>((resolve) => server.listen(MOCK_PORT, resolve));
}

async function sendPullRequest(request: APIRequestContext, headSha: string) {
  const body = JSON.stringify({
    action: "opened",
    installation: { id: INSTALLATION },
    repository: { full_name: REPO },
    pull_request: {
      number: 7,
      title: "링크 미리보기 추가",
      html_url: `https://github.com/${REPO}/pull/7`,
      draft: false,
      head: { sha: headSha },
    },
  });
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  return request.post("/api/github/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request",
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
    },
  });
}

async function waitForReview(headSha: string) {
  for (let i = 0; i < 90; i++) {
    const { data } = await admin
      .from("pr_reviews")
      .select("id, status, summary, error")
      .eq("project_id", projectId)
      .eq("head_sha", headSha)
      .maybeSingle();
    if (data && (data.status === "done" || data.status === "failed"))
      return data;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("PR 리뷰가 끝나지 않았습니다.");
}

let projectId = "";
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await startMock();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  if (!profile) throw new Error("pnpm e2e:local-seed 를 먼저 실행하세요.");
  await admin.from("projects").delete().eq("repo_full_name", REPO);
  await admin.from("github_installations").upsert(
    {
      user_id: profile.id,
      installation_id: INSTALLATION,
      account_login: "e2e",
    },
    { onConflict: "installation_id" },
  );
  const { data: project } = await admin
    .from("projects")
    .insert({
      user_id: profile.id,
      installation_id: INSTALLATION,
      repo_full_name: REPO,
      default_branch: "main",
      detected_stack: { tags: ["nextjs"], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  projectId = project!.id;
});

test.afterAll(async () => {
  server?.close();
  await admin.from("projects").delete().eq("id", projectId);
  await admin
    .from("github_installations")
    .delete()
    .eq("installation_id", INSTALLATION);
});

test("PR 가드를 켜기 전에는 PR 을 점검하지 않는다", async ({
  request,
  page,
}) => {
  const res = await sendPullRequest(request, sha());
  expect(await res.json()).toEqual({ handled: false });

  await page.goto(`/projects/${projectId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "PR 가드 켜기" }).click();
  await expect(
    page.getByRole("button", { name: "PR 가드 끄기" }),
  ).toBeVisible();
});

test("PR 을 열면 바뀐 줄을 점검해 상태 체크와 리뷰 코멘트를 남긴다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  calls.length = 0;
  const head = sha();
  const res = await sendPullRequest(request, head);
  expect(await res.json()).toEqual({ handled: true });
  // 재전송은 새 리뷰를 만들지 않는다.
  expect(await (await sendPullRequest(request, head)).json()).toEqual({
    handled: false,
  });

  const review = await waitForReview(head);
  expect(review.status).toBe("done");

  const { data: findings } = await admin
    .from("pr_review_findings")
    .select("rule_id, file_path, line, fix_prompt")
    .eq("review_id", review.id);
  const ruleIds = (findings ?? []).map((f) => f.rule_id).sort();
  expect(ruleIds).toEqual(
    expect.arrayContaining(["PR-001", "PR-002", "PR-004", "PR-005", "SEC-018"]),
  );
  expect((findings ?? []).every((f) => !!f.fix_prompt)).toBe(true);

  const check = calls.find(
    (c) => c.method === "PATCH" && c.path.endsWith("/check-runs/77"),
  );
  expect(check?.body.conclusion).toBe("failure");
  const annotations = (
    check?.body.output as { annotations: { path: string }[] }
  ).annotations;
  expect(annotations.map((a) => a.path)).toContain("app/api/preview/route.ts");

  const posted = calls.find((c) => c.path.endsWith("/pulls/7/reviews"));
  expect(posted?.body.event).toBe("COMMENT");
  expect(posted?.body.commit_id).toBe(head);
  const comments = posted?.body.comments as {
    path: string;
    line: number;
    side: string;
  }[];
  // 줄 코멘트는 추가된 줄에만: SSRF(3줄), @ts-ignore(2줄), raect(4줄). 지운 테스트 파일은 본문에만.
  expect(comments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: "app/api/preview/route.ts",
        line: 3,
        side: "RIGHT",
      }),
      expect.objectContaining({ path: "src/lib/pay.ts", line: 2 }),
      expect.objectContaining({ path: "package.json", line: 4 }),
    ]),
  );
  expect(comments.some((c) => c.path === "src/auth.test.ts")).toBe(false);
  expect(String(posted?.body.body)).toContain("src/auth.test.ts");

  await page.goto(`/projects/${projectId}`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /#7 링크 미리보기 추가/ }).click();
  await expect(
    page.getByRole("heading", { name: "링크 미리보기 추가" }),
  ).toBeVisible();
  await expect(
    page.getByText("심각한 문제가 있어 상태 체크를 실패로 표시했습니다."),
  ).toBeVisible();
  await expect(page.getByText("의심스러운 패키지 추가")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "복사" }).first(),
  ).toBeVisible();
});

test("App 에 리뷰 권한이 없으면 레고 화면에만 결과를 남기고 이유를 알려 준다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  denyReviews = true;
  const head = sha();
  await sendPullRequest(request, head);
  const review = await waitForReview(head);
  expect(review.status).toBe("done");
  expect((review.summary as { note: string }).note).toContain(
    "권한이 없습니다",
  );

  await page.goto(`/projects/${projectId}/reviews/${review.id}`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByText(/리뷰 코멘트: GitHub App 에 권한이 없습니다/),
  ).toBeVisible();
  denyReviews = false;
});
