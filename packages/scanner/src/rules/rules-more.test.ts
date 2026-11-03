import { describe, expect, it } from "vitest";
import type { Rule, SourceFile } from "../types";
import { sec015 } from "./sec-015";
import { sec016 } from "./sec-016";
import { sec017 } from "./sec-017";
import { sec018 } from "./sec-018";
import { sec019 } from "./sec-019";
import { sec020 } from "./sec-020";
import { sec021 } from "./sec-021";
import { sec022 } from "./sec-022";

const run = (rule: Rule, files: SourceFile[]) =>
  rule.detect({ files, paths: files.map((f) => f.path) });
const at = (rule: Rule, files: SourceFile[]) =>
  run(rule, files).map((c) => [c.filePath, c.lineStart]);
const file = (path: string, ...lines: string[]): SourceFile => ({
  path,
  content: lines.join("\n"),
});

describe("SEC-015 서버의 getSession", () => {
  it("서버 코드에서 getSession 으로만 사용자를 확인하면 찾는다", () => {
    expect(
      at(sec015, [
        file(
          "app/dashboard/page.tsx",
          `import { createClient } from "@/lib/supabase/server";`,
          `export default async function Page() {`,
          `  const { data: { session } } = await supabase.auth.getSession();`,
          `  if (!session) redirect("/login");`,
          `}`,
        ),
        file(
          "middleware.ts",
          `export async function middleware(req) {`,
          `  const { data } = await supabase.auth.getSession();`,
          `}`,
        ),
      ]),
    ).toEqual([
      ["app/dashboard/page.tsx", 3],
      ["middleware.ts", 2],
    ]);
  });

  it("브라우저 코드나 getUser 로 검증하는 파일은 통과한다", () => {
    expect(
      run(sec015, [
        file(
          "components/Nav.tsx",
          `"use client";`,
          `const { data } = await supabase.auth.getSession();`,
        ),
        file(
          "app/api/me/route.ts",
          `export async function GET() {`,
          `  const { data: { user } } = await supabase.auth.getUser();`,
          `  const { data: { session } } = await supabase.auth.getSession();`,
          `}`,
        ),
        file("lib/supabase/browser.ts", `await supabase.auth.getSession();`),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-016 미들웨어에서만 로그인 확인", () => {
  const middleware = file(
    "middleware.ts",
    `export async function middleware(request) {`,
    `  const { data: { user } } = await supabase.auth.getUser();`,
    `  if (!user) return NextResponse.redirect(new URL("/login", request.url));`,
    `}`,
    `export const config = { matcher: ["/dashboard/:path*", "/api/admin/:path*"] };`,
  );

  it("지키는 경로의 페이지·GET 라우트가 다시 확인하지 않고 데이터를 읽으면 찾는다", () => {
    expect(
      at(sec016, [
        middleware,
        file(
          "app/(app)/dashboard/page.tsx",
          `export default async function Page() {`,
          `  const { data } = await admin.from("invoices").select("*");`,
          `}`,
        ),
        file(
          "app/api/admin/users/route.ts",
          `export async function GET() {`,
          `  const users = await prisma.user.findMany();`,
          `  return Response.json(users);`,
          `}`,
        ),
      ]),
    ).toEqual([
      ["app/(app)/dashboard/page.tsx", 2],
      ["app/api/admin/users/route.ts", 2],
    ]);
  });

  it("안에서 다시 확인하거나 지키지 않는 경로, 미들웨어가 없으면 통과한다", () => {
    const pages = [
      file(
        "app/dashboard/page.tsx",
        `export default async function Page() {`,
        `  const user = await requireUser();`,
        `  const { data } = await sb.from("invoices").select("*");`,
        `}`,
      ),
      file(
        "app/blog/page.tsx",
        `export default async function Page() {`,
        `  const { data } = await sb.from("posts").select("*");`,
        `}`,
      ),
    ];
    expect(run(sec016, [middleware, ...pages])).toEqual([]);
    expect(run(sec016, pages.slice(1))).toEqual([]);
  });
});

describe("SEC-017 열린 리다이렉트", () => {
  it("쿼리·폼 값으로 그대로 이동하면 찾는다", () => {
    expect(
      at(sec017, [
        file(
          "app/auth/callback/route.ts",
          `export async function GET(request: Request) {`,
          `  const { searchParams, origin } = new URL(request.url);`,
          `  const next = searchParams.get("next") ?? "/";`,
          `  return NextResponse.redirect(\`\${origin}\${next}\`);`,
          `}`,
        ),
        file(
          "app/login/actions.ts",
          `"use server";`,
          `export async function login(formData: FormData) {`,
          `  const to = formData.get("redirectTo") as string;`,
          `  redirect(to);`,
          `}`,
        ),
        file(
          "components/AfterLogin.tsx",
          `"use client";`,
          `const sp = useSearchParams();`,
          `window.location.href = sp.get("returnTo")!;`,
        ),
      ]),
    ).toEqual([
      ["app/auth/callback/route.ts", 4],
      ["app/login/actions.ts", 4],
      ["components/AfterLogin.tsx", 3],
    ]);
  });

  it("고정 경로로 시작하거나 같은 사이트인지 검사하면 통과한다", () => {
    expect(
      run(sec017, [
        file(
          "app/projects/actions.ts",
          `"use server";`,
          `export async function create(formData: FormData) {`,
          `  const id = formData.get("id");`,
          `  redirect(\`/projects/\${id}\`);`,
          `}`,
        ),
        file(
          "app/auth/callback/route.ts",
          `export async function GET(request: Request) {`,
          `  const { searchParams, origin } = new URL(request.url);`,
          `  let next = searchParams.get("next") ?? "/";`,
          `  if (!next.startsWith("/")) next = "/";`,
          `  return NextResponse.redirect(\`\${origin}\${next}\`);`,
          `}`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-018 SSRF", () => {
  it("요청으로 받은 주소로 서버가 요청하면 찾는다", () => {
    expect(
      at(sec018, [
        file(
          "app/api/preview/route.ts",
          `export async function POST(req: Request) {`,
          `  const { url } = await req.json();`,
          `  const html = await fetch(url).then((r) => r.text());`,
          `  return Response.json({ html });`,
          `}`,
        ),
        file(
          "pages/api/proxy.ts",
          `export default async function handler(req, res) {`,
          `  const r = await axios.get(String(req.query.target));`,
          `  res.json(r.data);`,
          `}`,
        ),
      ]),
    ).toEqual([
      ["app/api/preview/route.ts", 3],
      ["pages/api/proxy.ts", 2],
    ]);
  });

  it("도메인이 고정됐거나, 허용 목록을 검사하거나, 브라우저 코드면 통과한다", () => {
    expect(
      run(sec018, [
        file(
          "app/api/gh/route.ts",
          `export async function GET(req: Request) {`,
          `  const user = new URL(req.url).searchParams.get("user");`,
          `  return fetch(\`https://api.github.com/users/\${user}\`);`,
          `}`,
        ),
        file(
          "app/api/preview/route.ts",
          `const ALLOWED_HOSTS = ["example.com"];`,
          `export async function POST(req: Request) {`,
          `  const { url } = await req.json();`,
          `  if (!ALLOWED_HOSTS.includes(new URL(url).hostname)) return new Response(null, { status: 400 });`,
          `  return fetch(url);`,
          `}`,
        ),
        file(
          "components/Search.tsx",
          `"use client";`,
          `const q = useSearchParams().get("q");`,
          `fetch(q!);`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-019 경로 조작", () => {
  it("요청 값이 들어간 경로로 파일을 읽으면 찾는다", () => {
    expect(
      at(sec019, [
        file(
          "app/api/docs/[name]/route.ts",
          `import { readFile } from "node:fs/promises";`,
          `import path from "node:path";`,
          `export async function GET(req: Request, { params }) {`,
          `  const { name } = await params;`,
          `  const text = await readFile(path.join(process.cwd(), "docs", name), "utf8");`,
          `  return new Response(text);`,
          `}`,
        ),
      ]),
    ).toEqual([["app/api/docs/[name]/route.ts", 5]]);
  });

  it("basename 으로 자르거나 고정 경로면 통과한다", () => {
    expect(
      run(sec019, [
        file(
          "app/api/docs/[name]/route.ts",
          `import { readFile } from "node:fs/promises";`,
          `export async function GET(req: Request, { params }) {`,
          `  const { name } = await params;`,
          `  return new Response(await readFile(path.join(DOCS, path.basename(name))));`,
          `}`,
        ),
        file(
          "scripts/build.ts",
          `import { readFileSync } from "node:fs";`,
          `const pkg = readFileSync("package.json", "utf8");`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-020 명령 실행·eval", () => {
  it("요청 값으로 셸 명령이나 eval 을 실행하면 찾는다", () => {
    expect(
      at(sec020, [
        file(
          "app/api/convert/route.ts",
          `import { exec } from "node:child_process";`,
          `export async function POST(req: Request) {`,
          `  const { file } = await req.json();`,
          `  exec(\`convert \${file} out.png\`);`,
          `}`,
        ),
        file(
          "app/api/calc/route.ts",
          `export async function GET(req: Request) {`,
          `  const expr = new URL(req.url).searchParams.get("q");`,
          `  return Response.json({ value: eval(expr!) });`,
          `}`,
        ),
      ]),
    ).toEqual([
      ["app/api/convert/route.ts", 4],
      ["app/api/calc/route.ts", 3],
    ]);
  });

  it("인자를 나눠 넘기는 execFile, 정규식 exec, 고정 명령은 통과한다", () => {
    expect(
      run(sec020, [
        file(
          "app/api/convert/route.ts",
          `import { execFile } from "node:child_process";`,
          `export async function POST(req: Request) {`,
          `  const { file } = await req.json();`,
          `  execFile("convert", [file, "out.png"]);`,
          `  const m = /x/.exec(file);`,
          `}`,
        ),
        file(
          "scripts/release.ts",
          `import { execSync } from "child_process";`,
          `execSync("git tag v1");`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-021 Mass Assignment", () => {
  it("받은 객체를 통째로 저장하면 찾는다", () => {
    expect(
      at(sec021, [
        file(
          "app/api/profile/route.ts",
          `export async function PATCH(req: Request) {`,
          `  const user = await getUser();`,
          `  const body = await req.json();`,
          `  await supabase.from("profiles").update(body).eq("id", user.id);`,
          `}`,
        ),
        file(
          "app/settings/actions.ts",
          `"use server";`,
          `export async function save(formData: FormData) {`,
          `  const user = await requireUser();`,
          `  await prisma.user.update({ where: { id: user.id }, data: Object.fromEntries(formData) });`,
          `}`,
          `export async function rename(input: { name: string }) {`,
          `  await prisma.team.create({ data: { ...input, ownerId: "x" } });`,
          `}`,
        ),
      ]),
    ).toEqual([
      ["app/api/profile/route.ts", 4],
      ["app/settings/actions.ts", 4],
      ["app/settings/actions.ts", 7],
    ]);
  });

  it("필드를 골라 넣거나 스키마로 검증한 값은 통과한다", () => {
    expect(
      run(sec021, [
        file(
          "app/api/profile/route.ts",
          `export async function PATCH(req: Request) {`,
          `  const body = await req.json();`,
          `  await supabase.from("profiles").update({ name: body.name });`,
          `  const input = profileSchema.parse(await req.json());`,
          `  await supabase.from("profiles").update(input);`,
          `}`,
        ),
        file(
          "app/notes/actions.ts",
          `"use server";`,
          `export async function add(title: string) {`,
          `  await db.insert(notes).values({ title });`,
          `  createHash("sha256").update(title);`,
          `}`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-022 Storage 버킷·정책", () => {
  it("공개 버킷과 사용자 확인 없는 storage 정책을 찾는다", () => {
    const found = run(sec022, [
      file(
        "supabase/migrations/1_storage.sql",
        `insert into storage.buckets (id, name, public) values ('invoices', 'invoices', true);`,
        `create policy "upload" on storage.objects for insert to anon with check (bucket_id = 'invoices');`,
        `create policy "read" on storage.objects for select using (bucket_id = 'invoices');`,
      ),
      file(
        "scripts/setup.ts",
        `await supabase.storage.createBucket("exports", { public: true });`,
      ),
    ]);
    expect(found.map((c) => [c.filePath, c.lineStart, c.severity])).toEqual([
      ["supabase/migrations/1_storage.sql", 1, "medium"],
      ["supabase/migrations/1_storage.sql", 2, "high"],
      ["supabase/migrations/1_storage.sql", 3, "medium"],
      ["scripts/setup.ts", 1, "medium"],
    ]);
  });

  it("비공개 버킷과 소유자 폴더를 확인하는 정책은 통과한다", () => {
    expect(
      run(sec022, [
        file(
          "supabase/migrations/1_storage.sql",
          `insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false);`,
          `create policy "own files" on storage.objects for all to authenticated`,
          `  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("SEC-017 내 사이트 주소", () => {
  it("고정 경로로 만든 URL 과 nextUrl.clone() 은 입력으로 보지 않는다", () => {
    expect(
      run(sec017, [
        file(
          "proxy.ts",
          `export async function proxy(request) {`,
          `  const loginUrl = new URL("/login", request.url);`,
          `  loginUrl.searchParams.set("next", request.nextUrl.pathname);`,
          `  const url = request.nextUrl.clone();`,
          `  url.pathname = "/login";`,
          `  if (x) return NextResponse.redirect(url);`,
          `  return NextResponse.redirect(loginUrl);`,
          `}`,
        ),
      ]),
    ).toEqual([]);
  });
});

describe("새 규칙의 오탐 줄이기", () => {
  it("경로가 고정된 router.push 객체, 조건으로 검사한 next 는 통과한다", () => {
    expect(
      run(sec017, [
        file(
          "app/checkin.tsx",
          `"use client";`,
          `const params = useSearchParams();`,
          `router.push({ pathname: "/checkin/[slot]", params: { slot: params.get("slot") } });`,
        ),
        file(
          "app/unlock/actions.ts",
          `"use server";`,
          `export async function unlock(slug: string, formData: FormData) {`,
          `  const next = String(formData.get("next") ?? "");`,
          `  redirect(next.startsWith(\`/\${slug}/\`) ? next : "/");`,
          `}`,
        ),
      ]),
    ).toEqual([]);
  });

  it("압축된 번들 파일은 건너뛴다", () => {
    const bundle = `var a=req.query.u;fetch(a);eval(req.body.c);${"x".repeat(6000)}`;
    expect(run(sec018, [file("plugins/main.js", bundle)])).toEqual([]);
  });
});
