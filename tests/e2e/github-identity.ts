import { execFileSync } from "node:child_process";

/**
 * 로컬 Supabase 전용: GitHub OAuth 없이 만든 테스트 사용자에게 github identity 를 붙인다.
 * 앱은 사용자가 고칠 수 없는 identities 에서만 GitHub 계정을 읽으므로, user_metadata 로는 로그인되지 않는다.
 */
export function linkGithubIdentity(
  userId: string,
  login: string,
  providerId: string,
) {
  const data = JSON.stringify({
    user_name: login,
    provider_id: providerId,
    sub: providerId,
  });
  const sql = `
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values ('${providerId}', '${userId}', '${data}'::jsonb, 'github', now(), now(), now())
    on conflict (provider_id, provider) do update
      set user_id = excluded.user_id, identity_data = excluded.identity_data;`;
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_lego",
      "psql",
      "-U",
      "postgres",
      "-q",
      "-c",
      sql,
    ],
    { stdio: "pipe" },
  );
}
