#!/usr/bin/env bash
# 원격(linked) DB 에 아직 적용하지 않은 supabase/migrations/*.sql 을 순서대로 적용한다.
# 이 프로젝트는 다른 앱과 Supabase 를 같이 쓰므로 `supabase db push` / `migration repair` 를 쓰지 않고,
# 적용 이력은 lego.schema_migrations 에 남긴다. 파일 하나는 트랜잭션 하나로 실행된다.
set -euo pipefail
cd "$(dirname "$0")/.."

# Supabase CLI v3: 운영(linked) 프로젝트는 --remote 로 고른다. 읽기는 --read-only,
# 쓰기는 확인 질문에 답할 수 없으므로 --yes 로 승인한다(이 스크립트를 실행하는 것 자체가 승인이다).
applied=$(npx supabase db query --remote --read-only \
  "select coalesce(json_agg(version), '[]') as v from lego.schema_migrations" 2>/dev/null \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).rows[0].v;if(!Array.isArray(v))process.exit(1);console.log(v.join("\n"))})') || {
  # 이력을 못 읽은 채 계속하면 모든 마이그레이션을 다시 적용하려 든다.
  echo "적용 이력(lego.schema_migrations)을 읽지 못했습니다. 아무것도 적용하지 않고 멈춥니다." >&2
  exit 1
}

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

for file in supabase/migrations/*.sql; do
  version=$(basename "$file" .sql)
  if grep -qx "$version" <<<"$applied"; then
    continue
  fi
  echo "적용: $version"
  { echo "begin;"; cat "$file"; echo; echo "insert into lego.schema_migrations (version) values ('$version');"; echo "commit;"; } >"$tmp"
  npx supabase db query --remote --yes -f "$tmp" >/dev/null
done

echo "완료"
