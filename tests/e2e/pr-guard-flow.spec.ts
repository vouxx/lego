import { createHmac, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 전용: PR 가드 전체 흐름. GitHub API 는 모의 서버(GITHUB_API_URL=http://localhost:4010)로 대신한다.
 *   GITHUB_API_URL=http://localhost:4010 pnpm dev  (개발 서버를 이 값으로 띄워야 한다)
 * PR 열기 → 코멘트·체크·위험 영역·스펙 범위 → 다음 커밋(해결·새 문제·중복 없음) → /lego ignore → 무시 유지.
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

const SSRF_ROUTE = [
  `export async function POST(req: Request) {`,
  `  const { url } = await req.json();`,
  `  const html = await fetch(url).then((r) => r.text());`,
  `  return Response.json({ html });`,
  `}`,
].join("\n");
// 다음 커밋: 고정 주소로만 요청하고 인증을 넣어 SSRF·인증 문제를 고친다.
const FIXED_ROUTE = [
  `export async function POST(req: Request) {`,
  `  const user = await requireUser();`,
  `  const html = await fetch("https://example.com/preview").then((r) => r.text());`,
  `  return Response.json({ html, user: user.id });`,
  `}`,
].join("\n");
const CALC_ROUTE = [
  `export async function GET(req: Request) {`,
  `  const user = await requireUser();`,
  `  const expr = new URL(req.url).searchParams.get("q");`,
  `  return Response.json({ value: eval(expr!), user: user.id });`,
  `}`,
].join("\n");
const PAY = [
  `export function charge(amount: number) {`,
  `  // @ts-ignore`,
  `  const key = process.env.RESEND_API_KEY;`,
  `  return send(key, amount);`,
  `}`,
].join("\n");
const PAY_PATCH = [
  "@@ -1,3 +1,5 @@",
  " export function charge(amount: number) {",
  "+  // @ts-ignore",
  "+  const key = process.env.RESEND_API_KEY;",
  "   return send(key, amount);",
  " }",
].join("\n");
const PKG_PATCH = [
  "@@ -3,2 +3,3 @@",
  '   "dependencies": {',
  '+    "raect": "^19.0.0",',
  '     "zod": "^4.0.0"',
].join("\n");
const PKG = `{\n  "name": "x",\n  "dependencies": {\n    "raect": "^19.0.0",\n    "zod": "^4.0.0"\n  }\n}`;

type PrState = {
  files: { filename: string; status: string; patch?: string }[];
  contents: Record<string, string>;
};
const FIRST: PrState = {
  files: [
    {
      filename: "app/api/preview/route.ts",
      status: "added",
      patch: asNewFile(SSRF_ROUTE),
    },
    { filename: "src/lib/pay.ts", status: "modified", patch: PAY_PATCH },
    { filename: "package.json", status: "modified", patch: PKG_PATCH },
    { filename: "src/auth.test.ts", status: "removed" },
  ],
  contents: {
    "app/api/preview/route.ts": SSRF_ROUTE,
    "src/lib/pay.ts": PAY,
    "package.json": PKG,
    ".env.example": "NEXT_PUBLIC_SUPABASE_URL=\n",
  },
};
const SECOND: PrState = {
  files: [
    {
      filename: "app/api/preview/route.ts",
      status: "added",
      patch: asNewFile(FIXED_ROUTE),
    },
    {
      filename: "app/api/calc/route.ts",
      status: "added",
      patch: asNewFile(CALC_ROUTE),
    },
    { filename: "src/lib/pay.ts", status: "modified", patch: PAY_PATCH },
    { filename: "package.json", status: "modified", patch: PKG_PATCH },
    { filename: "src/auth.test.ts", status: "removed" },
  ],
  contents: {
    ...FIRST.contents,
    "app/api/preview/route.ts": FIXED_ROUTE,
    "app/api/calc/route.ts": CALC_ROUTE,
  },
};

type Recorded = { method: string; path: string; body: Record<string, unknown> };
const calls: Recorded[] = [];
let pr: PrState = FIRST;
let deny = false;
let nextCommentId = 1000;
// 모의 GitHub 에 달린 줄 코멘트: 리뷰 id → 코멘트들
const reviewComments = new Map<
  number,
  { id: number; path: string; line: number }[]
>();
let nextReviewId = 88;
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
      if (path === `/repos/${REPO}/pulls/7/files`) return send(200, pr.files);
      if (path === `/repos/${REPO}/pulls/7/commits`)
        return send(200, [{ commit: { message: "링크 미리보기 API [T-1]" } }]);
      const content = path.match(new RegExp(`^/repos/${REPO}/contents/(.+)$`));
      if (content) {
        const text = pr.contents[decodeURIComponent(content[1]!)];
        return text === undefined
          ? send(404, { message: "Not Found" })
          : send(200, {
              type: "file",
              size: text.length,
              content: Buffer.from(text).toString("base64"),
            });
      }
      if (path === `/repos/${REPO}/check-runs`)
        return deny ? send(403, { message: "denied" }) : send(201, { id: 77 });
      if (path === `/repos/${REPO}/check-runs/77`) return send(200, { id: 77 });
      if (path === `/repos/${REPO}/pulls/7/reviews`) {
        if (deny)
          return send(403, {
            message: "Resource not accessible by integration",
          });
        const id = nextReviewId++;
        const comments = (
          (body.comments as { path: string; line: number }[]) ?? []
        ).map((c) => ({ id: nextCommentId++, path: c.path, line: c.line }));
        reviewComments.set(id, comments);
        return send(200, { id });
      }
      // 실제 GitHub 처럼 리뷰별 목록은 line 을 비우고, PR 전체 목록에만 line 이 있다.
      const listed = path.match(
        new RegExp(`^/repos/${REPO}/pulls/7/reviews/(\\d+)/comments$`),
      );
      if (listed)
        return send(
          200,
          (reviewComments.get(Number(listed[1])) ?? []).map((c) => ({
            ...c,
            line: null,
          })),
        );
      if (path === `/repos/${REPO}/pulls/7/comments`)
        return send(
          200,
          [...reviewComments].flatMap(([reviewId, cs]) =>
            cs.map((c) => ({ ...c, pull_request_review_id: reviewId })),
          ),
        );
      if (
        new RegExp(`^/repos/${REPO}/pulls/7/comments/\\d+/replies$`).test(path)
      )
        return send(201, { id: nextCommentId++ });
      if (path === "/graphql") {
        const query = String(body.query);
        if (query.includes("resolveReviewThread"))
          return send(200, {
            data: { resolveReviewThread: { thread: { id: "x" } } },
          });
        const nodes = [...reviewComments.values()].flat().map((c) => ({
          id: `T${c.id}`,
          isResolved: false,
          comments: { nodes: [{ databaseId: c.id }] },
        }));
        return send(200, {
          data: { repository: { pullRequest: { reviewThreads: { nodes } } } },
        });
      }
      send(404, { message: `mock: ${req.method} ${path}` });
    });
  });
  return new Promise<void>((resolve) => server.listen(MOCK_PORT, resolve));
}

const sign = (body: string) =>
  `sha256=${createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET ?? "")
    .update(body)
    .digest("hex")}`;

async function sendPullRequest(
  request: APIRequestContext,
  headSha: string,
  action = "opened",
) {
  const body = JSON.stringify({
    action,
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
  return request.post("/api/github/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request",
      "x-hub-signature-256": sign(body),
    },
  });
}

async function sendReply(
  request: APIRequestContext,
  inReplyTo: number,
  text: string,
  association = "OWNER",
) {
  const body = JSON.stringify({
    action: "created",
    installation: { id: INSTALLATION },
    repository: { full_name: REPO },
    pull_request: { number: 7 },
    comment: {
      id: nextCommentId++,
      body: text,
      in_reply_to_id: inReplyTo,
      author_association: association,
      user: { login: "vouxx", type: "User" },
    },
  });
  return request.post("/api/github/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request_review_comment",
      "x-hub-signature-256": sign(body),
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

const findings = async (reviewId: string) =>
  (
    await admin
      .from("pr_review_findings")
      .select(
        "rule_id, file_path, line, state, ignore_reason, github_comment_id, ai_verdict",
      )
      .eq("review_id", reviewId)
  ).data ?? [];

const lastCall = (method: string, suffix: string) =>
  [...calls]
    .reverse()
    .find((c) => c.method === method && c.path.endsWith(suffix));

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
  // [T-1] 커밋이 가리킬 스펙 작업(범위 확인용)
  const { data: spec } = await admin
    .from("specs")
    .insert({
      user_id: profile.id,
      project_id: projectId,
      idea: "링크 미리보기",
      title: "링크 미리보기",
      status: "ready",
    })
    .select("id")
    .single();
  await admin.from("spec_tasks").insert({
    spec_id: spec!.id,
    user_id: profile.id,
    key: "T-1",
    seq: 1,
    title: "링크 미리보기 API",
    description:
      "URL 을 받아 페이지 제목과 미리보기 HTML 을 돌려주는 API 를 만든다.",
  });
});

test.afterAll(async () => {
  server?.close();
  await admin.from("specs").delete().eq("project_id", projectId);
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

  // 메뉴 → PR 가드 → 프로젝트별 설정에서 켠다.
  await page.goto("/projects", { waitUntil: "networkidle" });
  await page
    .getByRole("navigation", { name: "주 메뉴" })
    .getByRole("link", { name: "PR 가드" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "PR 가드" }),
  ).toBeVisible();
  const row = page.getByRole("listitem").filter({ hasText: REPO });
  await row.getByRole("button", { name: "PR 가드 켜기" }).click();
  await expect(row.getByRole("button", { name: "PR 가드 끄기" })).toBeVisible();
});

test("PR 을 열면 코멘트·상태 체크·위험 영역·스펙 범위를 남긴다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  calls.length = 0;
  const head = sha();
  expect(await (await sendPullRequest(request, head)).json()).toEqual({
    handled: true,
  });
  // 재전송은 새 리뷰를 만들지 않는다.
  expect(await (await sendPullRequest(request, head)).json()).toEqual({
    handled: false,
  });

  const review = await waitForReview(head);
  expect(review.status).toBe("done");
  const rows = await findings(review.id);
  expect(rows.map((f) => f.rule_id)).toEqual(
    expect.arrayContaining(["PR-001", "PR-002", "PR-004", "PR-005", "SEC-018"]),
  );
  // 줄 코멘트를 단 항목은 코멘트 id 를 기억한다.
  expect(
    rows.find((f) => f.rule_id === "SEC-018")?.github_comment_id,
  ).toBeTruthy();

  const summary = review.summary as {
    risk: { id: string }[];
    scope: { tasks: { key: string }[] } | null;
  };
  expect(summary.risk.map((a) => a.id)).toEqual(
    expect.arrayContaining(["dependencies"]),
  );
  expect(summary.scope?.tasks.map((t) => t.key)).toEqual(["T-1"]);

  const check = lastCall("PATCH", "/check-runs/77");
  expect(check?.body.conclusion).toBe("failure");
  const posted = lastCall("POST", "/pulls/7/reviews");
  expect(posted?.body.commit_id).toBe(head);
  expect(String(posted?.body.body)).toContain("이 PR 이 건드린 위험 영역");
  expect(String(posted?.body.body)).toContain("스펙 작업 범위 (T-1");
  const comments = posted?.body.comments as { path: string; line: number }[];
  expect(comments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: "app/api/preview/route.ts", line: 3 }),
      expect.objectContaining({ path: "src/lib/pay.ts", line: 2 }),
      expect.objectContaining({ path: "package.json", line: 4 }),
    ]),
  );

  // PR 가드 메뉴의 최근 PR 목록에서 연다.
  await page.goto("/guard", { waitUntil: "networkidle" });
  const recent = page.getByRole("link", { name: new RegExp(`${REPO} #7`) });
  await expect(recent).toContainText("체크 실패");
  await recent.click();
  await expect(
    page.getByRole("heading", { name: "링크 미리보기 추가" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "이 PR 이 건드린 위험 영역" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "스펙 작업 범위" }),
  ).toBeVisible();
});

let secondReviewId = "";
test("다음 커밋: 고친 문제는 해결 답글·대화 접기, 새 문제만 코멘트, 남은 문제는 다시 달지 않는다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  calls.length = 0;
  pr = SECOND;
  const head = sha();
  await sendPullRequest(request, head, "synchronize");
  const review = await waitForReview(head);
  secondReviewId = review.id;
  expect(review.status).toBe("done");

  const summary = review.summary as {
    resolved: { ruleId: string }[];
    newCount: number;
  };
  expect(summary.resolved.map((r) => r.ruleId)).toEqual(
    expect.arrayContaining(["SEC-018"]),
  );
  expect(summary.newCount).toBeGreaterThan(0);

  const posted = lastCall("POST", "/pulls/7/reviews");
  const comments = posted?.body.comments as { path: string }[];
  expect(comments.length).toBeGreaterThan(0);
  expect(comments.every((c) => c.path === "app/api/calc/route.ts")).toBe(true);
  expect(String(posted?.body.body)).toContain("이번 커밋에서 새로 생긴 문제");
  expect(String(posted?.body.body)).toContain("해결됨");

  const replies = calls.filter((c) =>
    /\/pulls\/7\/comments\/\d+\/replies$/.test(c.path),
  );
  expect(replies.some((c) => String(c.body.body).includes("해결됐어요"))).toBe(
    true,
  );
  expect(
    calls.some(
      (c) =>
        c.path === "/graphql" &&
        String(c.body.query).includes("resolveReviewThread"),
    ),
  ).toBe(true);

  const check = lastCall("PATCH", "/check-runs/77");
  expect(String((check?.body.output as { title: string }).title)).toMatch(
    /해결 \d+개/,
  );

  await page.goto(`/projects/${projectId}/reviews/${review.id}`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByRole("heading", { name: /이 커밋에서 해결됨/ }),
  ).toBeVisible();
});

test("/lego ignore 답글로 무시하고, 권한 없는 사람은 거절하며, 다음 커밋에도 이어진다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  const rows = await findings(secondReviewId);
  const tsIgnore = rows.find((f) => f.rule_id === "PR-002");
  expect(tsIgnore?.github_comment_id).toBeTruthy();
  const commentId = Number(tsIgnore!.github_comment_id);

  calls.length = 0;
  await sendReply(
    request,
    commentId,
    "/lego ignore 외부 SDK 타입이 틀려서",
    "NONE",
  );
  expect(
    calls.some((c) => String(c.body.body).includes("쓰기 권한이 있는 사람만")),
  ).toBe(true);
  expect(
    (await findings(secondReviewId)).find((f) => f.rule_id === "PR-002")?.state,
  ).toBe("open");

  calls.length = 0;
  const res = await sendReply(
    request,
    commentId,
    "/lego ignore 외부 SDK 타입이 틀려서",
  );
  expect(await res.json()).toEqual({ handled: true });
  const ignored = (await findings(secondReviewId)).find(
    (f) => f.rule_id === "PR-002",
  );
  expect(ignored?.state).toBe("ignored");
  expect(ignored?.ignore_reason).toBe("외부 SDK 타입이 틀려서");
  expect(calls.some((c) => String(c.body.body).includes("무시했어요"))).toBe(
    true,
  );
  const check = lastCall("PATCH", "/check-runs/77");
  expect(String((check?.body.output as { title: string }).title)).toContain(
    "무시 1개",
  );

  // 다음 커밋에서도 무시 상태가 이어지고, 다시 코멘트하지 않는다.
  calls.length = 0;
  const head = sha();
  await sendPullRequest(request, head, "synchronize");
  const third = await waitForReview(head);
  expect(
    (await findings(third.id)).find((f) => f.rule_id === "PR-002")?.state,
  ).toBe("ignored");
  expect(lastCall("POST", "/pulls/7/reviews")).toBeUndefined();

  await page.goto(`/projects/${projectId}/reviews/${third.id}`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByText(/무시함 — 외부 SDK 타입이 틀려서 \(@vouxx\)/),
  ).toBeVisible();
});

test("App 에 권한이 없으면 레고 화면에만 결과를 남기고 이유를 알려 준다", async ({
  request,
  page,
}) => {
  test.setTimeout(180_000);
  deny = true;
  const head = sha();
  await sendPullRequest(request, head, "synchronize");
  const review = await waitForReview(head);
  expect(review.status).toBe("done");
  expect((review.summary as { note: string }).note).toContain(
    "권한이 없습니다",
  );
  await page.goto(`/projects/${projectId}/reviews/${review.id}`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByText(/상태 체크: GitHub App 에 권한이 없습니다/),
  ).toBeVisible();
  deny = false;
});
