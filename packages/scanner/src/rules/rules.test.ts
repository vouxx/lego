import { describe, expect, it } from "vitest";
import { fingerprint } from "../fingerprint";
import { maskSecrets } from "../secrets";
import type { Rule, SourceFile } from "../types";
import { sec001 } from "./sec-001";
import { sec002 } from "./sec-002";
import { sec003 } from "./sec-003";
import { sec004 } from "./sec-004";
import { sec005 } from "./sec-005";
import { sec006 } from "./sec-006";
import { sec007 } from "./sec-007";
import { sec008 } from "./sec-008";

// 가짜 키는 실행할 때 조립한다. 소스에 그대로 두면 GitHub push protection 에 걸린다.
const FAKE = {
  anthropic: "sk-ant-" + "api03-" + "x".repeat(40),
  openai: "sk-" + "proj-" + "y".repeat(40),
  stripe: "sk_" + "live_" + "z".repeat(24),
  serviceRoleJwt: [
    "eyJhbGciOiJIUzI1NiJ9",
    Buffer.from(
      JSON.stringify({ role: "service_role", iss: "supabase" }),
    ).toString("base64url"),
    "s".repeat(20),
  ].join("."),
  anonJwt: [
    "eyJhbGciOiJIUzI1NiJ9",
    Buffer.from(JSON.stringify({ role: "anon", iss: "supabase" })).toString(
      "base64url",
    ),
    "s".repeat(20),
  ].join("."),
};

const run = (
  rule: Rule,
  files: SourceFile[],
  paths = files.map((f) => f.path),
) => rule.detect({ files, paths });

describe("SEC-001 하드코딩된 키", () => {
  it("코드에 들어간 키를 찾는다", () => {
    const found = run(sec001, [
      {
        path: "src/lib/ai.ts",
        content: `const client = new Anthropic({ apiKey: "${FAKE.anthropic}" });`,
      },
      {
        path: "src/pay.ts",
        content: `\nconst stripe = new Stripe("${FAKE.stripe}");`,
      },
      {
        path: "src/admin.ts",
        content: `const key = "${FAKE.serviceRoleJwt}";`,
      },
    ]);
    expect(found.map((c) => [c.filePath, c.lineStart])).toEqual([
      ["src/lib/ai.ts", 1],
      ["src/pay.ts", 2],
      ["src/admin.ts", 1],
    ]);
  });

  it("환경 변수 참조와 공개용 anon 키는 무시한다", () => {
    const found = run(sec001, [
      {
        path: "src/lib/ai.ts",
        content: "new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })",
      },
      {
        path: "src/lib/supabase.ts",
        content: `createClient(url, "${FAKE.anonJwt}")`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-002 .env 커밋", () => {
  it("커밋된 .env 와 .gitignore 누락을 찾는다", () => {
    const found = run(
      sec002,
      [
        { path: ".gitignore", content: "node_modules\n.next\n" },
        { path: "src/a.ts", content: "process.env.DATABASE_URL" },
      ],
      [".gitignore", "src/a.ts", ".env.local", "apps/web/.env"],
    );
    expect(found.map((c) => c.filePath)).toEqual([
      ".env.local",
      "apps/web/.env",
      ".gitignore",
    ]);
  });

  it(".env.example 과 .env 를 무시하는 .gitignore 는 통과한다", () => {
    const found = run(
      sec002,
      [
        { path: ".gitignore", content: "node_modules\n.env*\n!.env.example\n" },
        { path: "src/a.ts", content: "process.env.DATABASE_URL" },
      ],
      [".gitignore", "src/a.ts", ".env.example"],
    );
    expect(found).toEqual([]);
  });
});

describe("SEC-003 공개 접두사가 붙은 비밀 키", () => {
  it("NEXT_PUBLIC_ 이 붙은 비밀 키 이름을 찾는다", () => {
    const found = run(sec003, [
      {
        path: "src/lib/ai.ts",
        content: "const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY;",
      },
      { path: ".env.example", content: "VITE_SUPABASE_SERVICE_ROLE_KEY=" },
    ]);
    expect(found.map((c) => c.filePath)).toEqual([
      "src/lib/ai.ts",
      ".env.example",
    ]);
  });

  it("공개용 키 이름은 통과한다", () => {
    const found = run(sec003, [
      {
        path: "src/lib/supabase.ts",
        content:
          "createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)",
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-004 클라이언트의 service_role", () => {
  it('"use client" 파일의 service_role 키 참조를 찾는다', () => {
    const found = run(sec004, [
      {
        path: "src/components/Admin.tsx",
        content: `"use client";\nimport { createClient } from "@supabase/supabase-js";\nconst sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);`,
      },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]!.lineStart).toBe(3);
  });

  it("서버 파일은 통과한다", () => {
    const found = run(sec004, [
      {
        path: "src/lib/admin.ts",
        content: `import "server-only";\nconst sb = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-005 RLS 미활성화", () => {
  it("RLS 를 켜지 않은 테이블을 찾는다", () => {
    const found = run(sec005, [
      {
        path: "supabase/migrations/0001_init.sql",
        content: `create table public.posts (id uuid primary key);\ncreate table profiles (id uuid);\nalter table profiles enable row level security;`,
      },
      {
        path: "supabase/migrations/0002_comments.sql",
        content: `-- comments\ncreate table if not exists "Comments" (\n  id uuid\n);`,
      },
    ]);
    expect(found.map((c) => [c.filePath, c.lineStart, c.reason])).toEqual([
      [
        "supabase/migrations/0001_init.sql",
        1,
        "posts 테이블에 enable row level security 가 없음",
      ],
      [
        "supabase/migrations/0002_comments.sql",
        2,
        "comments 테이블에 enable row level security 가 없음",
      ],
    ]);
  });

  it("켰다가 다시 끈 테이블은 끈 문장을 가리킨다", () => {
    const found = run(sec005, [
      {
        path: "supabase/migrations/0001.sql",
        content: `create table posts (id uuid);\nalter table posts enable row level security;\nalter table public.posts disable row level security;`,
      },
    ]);
    expect(found.map((c) => c.lineStart)).toEqual([3]);
  });

  it("다른 마이그레이션에서 켠 경우와 함수 본문 안 문장은 통과한다", () => {
    const found = run(sec005, [
      {
        path: "supabase/migrations/0001.sql",
        content: `create table posts (id uuid);\ncreate function f() returns void language plpgsql as $$ begin create temp table t (x int); end; $$;`,
      },
      {
        path: "supabase/migrations/0002.sql",
        content: "alter table public.posts enable row level security;",
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-006 using (true)", () => {
  it("전체 허용 정책을 찾는다", () => {
    const found = run(sec006, [
      {
        path: "supabase/migrations/0003.sql",
        content: `create policy "anyone" on posts\n  for all using (true) with check (true);`,
      },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]!.lineEnd).toBe(2);
  });

  it("소유자 조건이 있는 정책은 통과한다", () => {
    const found = run(sec006, [
      {
        path: "x.sql",
        content: `create policy "own" on posts for select using (user_id = auth.uid());`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-007 인증 없는 쓰기 엔드포인트", () => {
  it("인증 확인 없는 POST 와 Server Action 을 찾는다", () => {
    const found = run(sec007, [
      {
        path: "src/app/api/posts/route.ts",
        content: `export async function GET() { return Response.json([]) }\nexport async function POST(req: Request) {\n  const body = await req.json();\n  await db.insert(body);\n}`,
      },
      {
        path: "src/features/posts/actions.ts",
        content: `"use server";\nexport async function deletePost(id: string) {\n  await db.delete(id);\n}`,
      },
    ]);
    expect(found.map((c) => [c.filePath, c.lineStart, c.lineEnd])).toEqual([
      ["src/app/api/posts/route.ts", 2, 5],
      ["src/features/posts/actions.ts", 2, 4],
    ]);
  });

  it("인증을 확인하는 핸들러는 통과한다", () => {
    const found = run(sec007, [
      {
        path: "app/api/posts/route.ts",
        content: `export async function POST(req: Request) {\n  const { data } = await supabase.auth.getUser();\n  if (!data.user) return new Response(null, { status: 401 });\n}`,
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("SEC-008 문자열로 만든 SQL", () => {
  it("템플릿 문자열과 + 로 만든 SQL 을 찾는다", () => {
    const found = run(sec008, [
      {
        path: "src/db.ts",
        content: [
          "export const byId = (id: string) => pool.query(`select * from users where id = ${id}`);",
          "export const byName = (n: string) => db.raw('select * from users where name = \\'' + n + '\\'');",
        ].join("\n"),
      },
    ]);
    expect(found.map((c) => c.lineStart)).toEqual([1, 2]);
  });

  it("파라미터 바인딩과 태그 템플릿은 통과한다", () => {
    const found = run(sec008, [
      {
        path: "src/db.ts",
        content: [
          "pool.query('select * from users where id = $1', [id]);",
          "await sql`select * from users where id = ${id}`;",
          "prisma.$queryRaw`select * from users where id = ${id}`;",
        ].join("\n"),
      },
    ]);
    expect(found).toEqual([]);
  });
});

describe("마스킹과 fingerprint", () => {
  it("비밀값을 앞뒤만 남기고 가린다", () => {
    const masked = maskSecrets(`key = "${FAKE.anthropic}"`);
    expect(masked).not.toContain(FAKE.anthropic);
    expect(masked).toMatch(/sk-ant-\*\*\*\*xxxx/);
  });

  it("공백이 달라도 같은 fingerprint, 파일이 다르면 다른 fingerprint", () => {
    const a = fingerprint({
      ruleId: "SEC-001",
      filePath: "a.ts",
      snippet: "const  x = 1;",
    });
    const b = fingerprint({
      ruleId: "SEC-001",
      filePath: "a.ts",
      snippet: "const x = 1;",
    });
    const c = fingerprint({
      ruleId: "SEC-001",
      filePath: "b.ts",
      snippet: "const x = 1;",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
