/**
 * 로컬 Supabase 전용: GitHub OAuth 없이 로그인한 상태의 E2E 를 돌리기 위해
 * 테스트 사용자와 공개 리포 프로젝트를 만들고 세션을 tests/e2e/.auth/local.json 에 저장한다.
 *   pnpm e2e:local-seed
 * 운영(원격) DB 를 가리키면 아무것도 하지 않고 끝낸다.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";
const { hostname } = new URL(url);
if (!["127.0.0.1", "localhost"].includes(hostname)) {
  console.error(`로컬 Supabase 가 아닙니다(${hostname}). 중단합니다.`);
  process.exit(1);
}

const EMAIL = "e2e@lego.test";
const REPO = process.env.E2E_REPO ?? "vouxx/ZEEK";
// 매번 새로 만들고 바로 로그인하므로 어디에도 저장하지 않는다.
const password = randomBytes(24).toString("base64url");
const metadata = { user_name: "lego-e2e", provider_id: "990000001" };

const admin = createClient(url, secretKey, {
  auth: { persistSession: false },
});
const lego = admin.schema("lego");

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email === EMAIL);
const user = existing
  ? (
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: metadata,
      })
    ).data.user
  : (
      await admin.auth.admin.createUser({
        email: EMAIL,
        password,
        email_confirm: true,
        user_metadata: metadata,
      })
    ).data.user;
if (!user) throw new Error("테스트 사용자를 만들지 못했습니다.");

await lego
  .from("profiles")
  .upsert({ id: user.id, github_login: metadata.user_name });
// 매 실행마다 깨끗한 프로젝트로 시작한다(규칙 파일·스캔은 cascade 로 지워진다).
await lego.from("projects").delete().eq("user_id", user.id);
const { data: project, error } = await lego
  .from("projects")
  .insert({
    user_id: user.id,
    installation_id: null,
    repo_full_name: REPO,
    default_branch: "main",
    detected_stack: { tags: [], packageManager: null, versions: {} },
  })
  .select("id")
  .single();
if (error) throw error;

const cookies: { name: string; value: string }[] = [];
const ssr = createServerClient(url, publishableKey, {
  cookies: {
    getAll: () => [],
    setAll: (items) => {
      cookies.push(...items);
    },
  },
});
const signIn = await ssr.auth.signInWithPassword({ email: EMAIL, password });
if (signIn.error) throw signIn.error;

mkdirSync("tests/e2e/.auth", { recursive: true });
writeFileSync(
  "tests/e2e/.auth/local.json",
  JSON.stringify({
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      expires: -1,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    })),
    origins: [],
  }),
);
writeFileSync(
  "tests/e2e/.auth/local-project.json",
  JSON.stringify({ projectId: project.id, repo: REPO }),
);
console.log(`저장했습니다: tests/e2e/.auth/local.json (프로젝트 ${REPO})`);
