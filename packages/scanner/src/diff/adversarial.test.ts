import { describe, expect, it } from "vitest";
import {
  codeContext,
  isClientFile,
  maskSecrets,
  reviewPullRequest,
  runRules,
} from "../index";

/** 리포 내용은 공격자가 쓸 수 있다. 200KB(파일 크기 제한) 입력으로 모든 규칙이 빨리 끝나야 한다. */
const LIMIT = 200_000;
const fill = (unit: string) => unit.repeat(Math.ceil(LIMIT / unit.length));
const PAYLOADS: Record<string, string> = {
  comments: fill("/**/"),
  jwt: fill("eyJ-"),
  jwtDots: fill("eyJaaaaaaaaaaaa."),
  pem: fill("-----BEGIN PRIVATE KEY-----\n"),
  pemNoEnd: `-----BEGIN PRIVATE KEY-----${fill("a ")}`,
  slashes: fill("//"),
  parens: fill("(("),
  quotes: fill("\"'"),
  spaces: fill(" "),
  lines: fill("\n"),
  sqlAlter: fill("alter table a "),
  sqlPolicy: fill("create policy a "),
  routes: fill("/:a(b)"),
  urls: fill("postgres://a:"),
  fetches: fill("fetch(a);"),
  templates: fill("`${"),
  supabase: fill("supabase.from('a')."),
  auth: fill("getUser();"),
  sk: fill("sk-"),
  env: fill("process.env."),
};
const PATHS = [
  "src/app/api/x/route.ts",
  "src/app/page.tsx",
  "supabase/migrations/1_a.sql",
  "next.config.js",
  "package.json",
];

describe.each(Object.entries(PAYLOADS))("적대적 입력: %s", (name, content) => {
  it("파일 5개를 6초 안에 끝낸다", { timeout: 20_000 }, () => {
    const started = performance.now();
    const files = PATHS.map((path) => ({ path, content }));
    runRules({ files, paths: PATHS });
    expect(performance.now() - started, name).toBeLessThan(6_000);
  });

  it("PR 리뷰와 마스킹도 6초 안에 끝난다", { timeout: 20_000 }, () => {
    const started = performance.now();
    reviewPullRequest(
      PATHS.map((path) => ({
        path,
        status: "added" as const,
        patch: `@@ -0,0 +1 @@\n+${content.slice(0, 2000)}`,
        content,
      })),
      null,
    );
    maskSecrets(content);
    codeContext(
      { path: "a.ts", content },
      {
        ruleId: "X",
        severity: "low",
        filePath: "a.ts",
        lineStart: 1,
        lineEnd: 1,
        snippet: "",
        reason: "",
      },
    );
    expect(performance.now() - started, name).toBeLessThan(6_000);
  });
});

describe("isClientFile", () => {
  it("주석 뒤의 use client 를 찾는다", () => {
    expect(isClientFile('"use client";')).toBe(true);
    expect(isClientFile(`// a\n/* b\nc */\n  'use client';`)).toBe(true);
    expect(isClientFile('import a from "a";\n"use client";')).toBe(false);
    expect(isClientFile("/* 닫히지 않은 주석")).toBe(false);
  });
});

describe("maskSecrets", () => {
  const body = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC";
  it("여러 줄 개인 키 본문을 가리고 줄 수는 유지한다", () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${body}\n${body}\n-----END PRIVATE KEY-----`;
    const masked = maskSecrets(`const a = 1;\n${pem}\nconst b = 2;`);
    expect(masked).not.toContain(body);
    expect(masked.split("\n")).toHaveLength(6);
    expect(masked).toContain("const b = 2;");
  });
  it("\\n 으로 이어 쓴 개인 키도 가린다", () => {
    const masked = maskSecrets(
      `key: "-----BEGIN RSA PRIVATE KEY-----\\n${body}\\n-----END RSA PRIVATE KEY-----"`,
    );
    expect(masked).not.toContain(body);
  });
  it("연결 문자열의 비밀번호를 가린다", () => {
    expect(maskSecrets("postgres://app:s3cretpw@db.example.com/x")).toBe(
      "postgres://app:****@db.example.com/x",
    );
  });
  it("SendGrid·npm·Hugging Face 토큰을 가린다", () => {
    const sendgrid = `SG.${"a".repeat(22)}.${"b".repeat(43)}`;
    const npm = `npm_${"c".repeat(36)}`;
    const hf = `hf_${"d".repeat(34)}`;
    const masked = maskSecrets(`${sendgrid} ${npm} ${hf}`);
    expect(masked).not.toContain("a".repeat(22));
    expect(masked).not.toContain("c".repeat(36));
    expect(masked).not.toContain("d".repeat(34));
  });
});
