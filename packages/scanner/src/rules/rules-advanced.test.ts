import { describe, expect, it, vi } from "vitest";
import { auditDependencies } from "../dependencies/osv";
import { readDependencies } from "../dependencies/lockfile";
import type { Rule, SourceFile } from "../types";
import { sec007 } from "./sec-007";
import { sec009 } from "./sec-009";
import { sec010 } from "./sec-010";
import { sec011 } from "./sec-011";
import { sec012 } from "./sec-012";
import { sec013 } from "./sec-013";

const run = (rule: Rule, files: SourceFile[]) =>
  rule.detect({ files, paths: files.map((f) => f.path) });

describe("SEC-009 IDOR", () => {
  it("요청의 id 로 소유자 확인 없이 조회·수정하는 곳을 찾는다", () => {
    const found = run(sec009, [
      {
        path: "app/api/orders/[id]/route.ts",
        content: `export async function GET(req: Request, { params }) {\n  const { id } = await params;\n  const { data } = await admin.from("orders").select().eq("id", id).single();\n  return Response.json(data);\n}`,
      },
      {
        path: "src/features/notes/actions.ts",
        content: `"use server";\nexport async function updateNote(noteId: string, body: string) {\n  await requireUser();\n  await prisma.note.update({ where: { id: noteId }, data: { body } });\n}`,
      },
    ]);
    expect(found.map((c) => [c.filePath, c.lineStart])).toEqual([
      ["app/api/orders/[id]/route.ts", 3],
      ["src/features/notes/actions.ts", 4],
    ]);
  });

  it("소유자 조건을 함께 거는 쿼리는 통과한다", () => {
    const found = run(sec009, [
      {
        path: "app/api/orders/[id]/route.ts",
        content: `export async function GET(req: Request, { params }) {\n  const user = await getUser();\n  const { id } = await params;\n  const { data } = await sb.from("orders").select().eq("id", id).eq("user_id", user.id);\n}`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-010 dangerouslySetInnerHTML", () => {
  it("살균하지 않은 값을 찾는다", () => {
    const found = run(sec010, [
      {
        path: "src/components/Post.tsx",
        content: `export function Post({ post }) {\n  return <div dangerouslySetInnerHTML={{ __html: marked(post.body) }} />;\n}`,
      },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]!.lineStart).toBe(2);
  });

  it("DOMPurify, 고정 문자열, 이스케이프한 JSON-LD 는 통과한다", () => {
    const found = run(sec010, [
      {
        path: "src/components/Safe.tsx",
        content: [
          "const a = <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;",
          'const b = <style dangerouslySetInnerHTML={{ __html: "body{margin:0}" }} />;',
          'const c = <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\\\u003c") }} />;',
        ].join("\n"),
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-011 CORS", () => {
  it("모든 출처 허용과 credentials 를 함께 쓰면 찾는다", () => {
    const found = run(sec011, [
      {
        path: "src/proxy.ts",
        content: `res.headers.set("Access-Control-Allow-Origin", req.headers.get("origin") ?? "*");\nres.headers.set("Access-Control-Allow-Credentials", "true");`,
      },
      {
        path: "server/index.ts",
        content: `app.use(cors({ origin: true, credentials: true }));`,
      },
    ]);
    expect(found.map((c) => c.filePath)).toEqual([
      "src/proxy.ts",
      "server/index.ts",
    ]);
  });

  it("허용 목록이 있거나 credentials 가 없으면 통과한다", () => {
    const found = run(sec011, [
      {
        path: "a.ts",
        content: `headers: { "Access-Control-Allow-Origin": "*" }`,
      },
      {
        path: "b.ts",
        content: `app.use(cors({ origin: ["https://app.example.com"], credentials: true }));`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-012 webhook 서명", () => {
  it("서명 확인 없는 webhook 핸들러를 찾고, SEC-007 과 겹치지 않는다", () => {
    const files = [
      {
        path: "app/api/webhooks/stripe/route.ts",
        content: `export async function POST(req: Request) {\n  const event = await req.json();\n  if (event.type === "checkout.session.completed") await markPaid(event.data.object.id);\n  return new Response("ok");\n}`,
      },
    ];
    expect(run(sec012, files).map((c) => c.lineStart)).toEqual([1]);
    expect(run(sec007, files)).toEqual([]);
  });

  it("@octokit/webhooks-methods 의 verify 로 검증하면 통과한다", () => {
    const found = run(sec012, [
      {
        path: "app/api/webhooks/github/route.ts",
        content: `import { verify } from "@octokit/webhooks-methods";\nexport async function POST(req: Request) {\n  const body = await req.text();\n  if (!(await verify(secret, body, sig))) return new Response(null, { status: 401 });\n}`,
      },
    ]);
    expect(found).toEqual([]);
  });

  it("constructEvent 로 검증하면 통과한다", () => {
    const found = run(sec012, [
      {
        path: "app/api/webhooks/stripe/route.ts",
        content: `export async function POST(req: Request) {\n  const sig = req.headers.get("stripe-signature")!;\n  const event = stripe.webhooks.constructEvent(await req.text(), sig, secret);\n}`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-013 LLM 사용량 제한", () => {
  it("제한 없이 LLM 을 부르는 엔드포인트를 찾는다", () => {
    const found = run(sec013, [
      {
        path: "app/api/chat/route.ts",
        content: `export async function POST(req: Request) {\n  const { messages } = await req.json();\n  const res = await anthropic.messages.create({ model, max_tokens: 1024, messages });\n  return Response.json(res);\n}`,
      },
    ]);
    expect(found.map((c) => c.lineStart)).toEqual([3]);
  });

  it("rate limit 을 거는 파일은 통과한다", () => {
    const found = run(sec013, [
      {
        path: "app/api/chat/route.ts",
        content: `const ratelimit = new Ratelimit({ limiter: Ratelimit.slidingWindow(10, "1 m") });\nexport async function POST(req: Request) {\n  const { success } = await ratelimit.limit(ip);\n  const text = await generateText({ model, prompt });\n}`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-014 의존성", () => {
  const files: SourceFile[] = [
    {
      path: "package.json",
      content: JSON.stringify({ dependencies: { next: "^14.0.0" } }),
    },
    {
      path: "package-lock.json",
      content: JSON.stringify(
        {
          lockfileVersion: 3,
          packages: {
            "": { dependencies: { next: "^14.0.0" } },
            "node_modules/next": { version: "14.0.0" },
            "node_modules/tiny": { version: "1.0.0" },
          },
        },
        null,
        2,
      ),
    },
  ];

  it("lockfile 에서 설치 버전과 직접 의존성 여부를 읽는다", () => {
    expect(
      readDependencies([
        ...files,
        {
          path: "web/pnpm-lock.yaml",
          content:
            "lockfileVersion: '9.0'\n\npackages:\n\n  '@scope/ui@2.1.0':\n    resolution: {}\n  react@19.0.0(peer@1.0.0):\n    resolution: {}\n",
        },
        {
          path: "api/yarn.lock",
          content: '"lodash@^4.17.0", lodash@^4.17.20:\n  version "4.17.20"\n',
        },
      ]).map((d) => `${d.file}:${d.line} ${d.name}@${d.version} ${d.direct}`),
    ).toEqual([
      "package-lock.json:9 next@14.0.0 true",
      "package-lock.json:12 tiny@1.0.0 false",
      "web/pnpm-lock.yaml:5 @scope/ui@2.1.0 false",
      "web/pnpm-lock.yaml:7 react@19.0.0 false",
      "api/yarn.lock:1 lodash@4.17.20 false",
    ]);
  });

  it("OSV 결과를 후보로 바꾸고, 간접 의존성의 낮은 등급은 뺀다", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith("/querybatch"))
        return Response.json({
          results: [
            { vulns: [{ id: "GHSA-next" }] },
            { vulns: [{ id: "GHSA-tiny" }] },
          ],
        });
      if (u.endsWith("/GHSA-next"))
        return Response.json({
          id: "GHSA-next",
          aliases: ["CVE-2025-29927"],
          summary: "Authorization bypass in middleware",
          database_specific: { severity: "CRITICAL" },
          affected: [
            {
              package: { name: "next" },
              ranges: [{ events: [{ introduced: "0" }, { fixed: "14.2.25" }] }],
            },
          ],
        });
      return Response.json({
        id: "GHSA-tiny",
        database_specific: { severity: "LOW" },
      });
    });
    const found = await auditDependencies(
      { files, paths: files.map((f) => f.path) },
      { fetch: fetchMock as unknown as typeof fetch },
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      ruleId: "SEC-014",
      severity: "critical",
      filePath: "package-lock.json",
      snippet: "next@14.0.0",
    });
    expect(found[0]!.reason).toContain("CVE-2025-29927");
    expect(found[0]!.reason).toContain("14.2.25");
  });
});
