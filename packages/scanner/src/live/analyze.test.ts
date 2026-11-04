import { describe, expect, it } from "vitest";
import {
  checkAuthSettings,
  checkBucketListing,
  checkBundle,
  checkExposedFile,
  checkHeaders,
  checkSourceMap,
  checkTableExposure,
  findSupabaseConfig,
  linkToCode,
  schemaFromMigrations,
} from "./analyze";

const jwt = (role: string) =>
  [
    "eyJhbGciOiJIUzI1NiJ9",
    Buffer.from(JSON.stringify({ role, iss: "supabase" })).toString(
      "base64url",
    ),
    "s".repeat(24),
  ].join(".");

describe("LIVE-001/006 테이블", () => {
  it("행이 읽히면 찾고, 민감한 이름은 치명, 코드에서 RLS 를 켰으면 차이도 알린다", () => {
    const rls = new Map([["orders", true]]);
    expect(
      checkTableExposure("orders", 3, rls).map((f) => [f.id, f.severity]),
    ).toEqual([
      ["LIVE-001", "critical"],
      ["LIVE-006", "high"],
    ]);
    expect(
      checkTableExposure("posts", 1, new Map()).map((f) => f.severity),
    ).toEqual(["high"]);
    expect(checkTableExposure("orders", 0, rls)).toEqual([]);
  });
});

describe("LIVE-002 버킷", () => {
  it("파일 목록이 보이면 찾는다", () => {
    expect(checkBucketListing("invoices", 2)).toHaveLength(1);
    expect(checkBucketListing("invoices", 0)).toEqual([]);
  });
});

describe("LIVE-003 번들의 비밀 키", () => {
  it("비밀 키와 service_role 은 찾고 anon 키는 넘긴다", () => {
    const bundle = [
      `const s="${"sk_" + "live_" + "Zr8".repeat(9)}";`,
      `const a="${jwt("anon")}";`,
      `const r="${jwt("service_role")}";`,
    ].join("\n");
    const found = checkBundle("/app.js", bundle);
    expect(found.map((f) => f.id)).toEqual(["LIVE-003", "LIVE-003"]);
    expect(found.every((f) => !f.detail.includes("Zr8Zr8Zr8Zr8"))).toBe(true);
  });
});

describe("LIVE-004 헤더", () => {
  it("빠진 헤더만 찾고 CSP frame-ancestors 는 X-Frame-Options 대신 인정한다", () => {
    expect(checkHeaders({}).map((f) => f.target)).toEqual([
      "strict-transport-security",
      "content-security-policy",
      "x-frame-options",
      "x-content-type-options",
    ]);
    expect(
      checkHeaders({
        "Strict-Transport-Security": "max-age=63072000",
        "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      }),
    ).toEqual([]);
  });
});

describe("LIVE-005 민감 파일", () => {
  it("진짜 .env·.git 만 찾고, 모든 주소에 200 으로 답하는 SPA 의 HTML 은 넘긴다", () => {
    expect(
      checkExposedFile("/.env", 200, "DATABASE_URL=postgres://x\n"),
    ).toHaveLength(1);
    expect(checkExposedFile("/.env", 200, "<!doctype html><html>")).toEqual([]);
    expect(
      checkExposedFile("/.git/config", 200, "[core]\n\tbare = false"),
    ).toHaveLength(1);
    expect(checkExposedFile("/.git/config", 404, "[core]")).toEqual([]);
    expect(
      checkSourceMap("/app.js", 200, '{"version":3,"sources":["a.ts"]}'),
    ).toHaveLength(1);
  });
});

describe("LIVE-007 Auth 설정", () => {
  it("이메일 확인 없이 가입되면 찾는다", () => {
    expect(checkAuthSettings({ mailer_autoconfirm: true })).toHaveLength(1);
    expect(
      checkAuthSettings({ mailer_autoconfirm: true, disable_signup: true }),
    ).toEqual([]);
    expect(checkAuthSettings({ mailer_autoconfirm: false })).toEqual([]);
  });
});

describe("설정 찾기", () => {
  it("번들에서 Supabase 주소와 공개 키를 찾고 service_role 은 쓰지 않는다", () => {
    const anon = jwt("anon");
    expect(
      findSupabaseConfig([
        `x="${jwt("service_role")}"`,
        `createClient("https://abcdefghijklmnopqrst.supabase.co","${anon}")`,
      ]),
    ).toEqual({ url: "https://abcdefghijklmnopqrst.supabase.co", key: anon });
    expect(findSupabaseConfig(["no config"])).toBeNull();
  });

  it("마이그레이션에서 RLS 상태와 버킷 이름을 읽는다", () => {
    const { rls, buckets } = schemaFromMigrations([
      {
        path: "supabase/migrations/1.sql",
        content: [
          "create table public.orders (id int);",
          "alter table public.orders enable row level security;",
          "create table notes (id int);",
          "insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true), ('docs', 'docs', false);",
        ].join("\n"),
      },
    ]);
    expect([...rls]).toEqual([
      ["orders", true],
      ["notes", false],
    ]);
    expect([...buckets]).toEqual(["avatars", "docs"]);
  });
});

describe("운영 문제 → 코드 위치", () => {
  const schema = schemaFromMigrations([
    {
      path: "supabase/migrations/0001_init.sql",
      content: [
        "-- 시작",
        "create table public.orders (id int);",
        "",
        "create table notes (id int);",
        "alter table notes enable row level security;",
        "insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);",
      ].join("\n"),
    },
  ]);

  it("테이블·RLS·버킷을 만든 파일과 줄을 붙이고 수정 프롬프트에도 적는다", () => {
    const linked = linkToCode(
      [
        ...checkTableExposure("orders", 3, schema.rls),
        ...checkTableExposure("notes", 1, schema.rls),
        ...checkBucketListing("avatars", 2),
        ...checkHeaders({}),
      ],
      schema,
    );
    const byId = (id: string, target: string) =>
      linked.find((f) => f.id === id && f.target === target);
    expect(byId("LIVE-001", "orders")?.code).toEqual({
      path: "supabase/migrations/0001_init.sql",
      line: 2,
      what: "create table",
    });
    expect(byId("LIVE-006", "notes")?.code?.line).toBe(5);
    expect(byId("LIVE-002", "avatars")?.code?.what).toBe("storage.buckets");
    expect(byId("LIVE-001", "orders")?.fix).toContain(
      "supabase/migrations/0001_init.sql:2",
    );
    expect(
      linked.filter((f) => f.id === "LIVE-004").every((f) => !f.code),
    ).toBe(true);
  });
});
