#!/usr/bin/env bash
# 원격(linked) DB 에 아직 적용하지 않은 supabase/migrations/*.sql 을 순서대로 적용한다.
# 이 프로젝트는 다른 앱과 Supabase 를 같이 쓰므로 `supabase db push` / `migration repair` 를 쓰지 않고,
# 적용 이력은 lego.schema_migrations 에 남긴다. 파일 하나는 트랜잭션 하나로 실행된다.
set -euo pipefail
cd "$(dirname "$0")/.."

query() { npx supabase db query --linked "$@" 2>/dev/null; }

applied=$(query "select coalesce(json_agg(version), '[]') as v from lego.schema_migrations" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).rows[0].v.join("\n"))}catch{}})' \
  || true)

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

for file in supabase/migrations/*.sql; do
  version=$(basename "$file" .sql)
  if grep -qx "$version" <<<"$applied"; then
    continue
  fi
  echo "적용: $version"
  { echo "begin;"; cat "$file"; echo; echo "insert into lego.schema_migrations (version) values ('$version');"; echo "commit;"; } >"$tmp"
  npx supabase db query --linked -f "$tmp" >/dev/null
done

echo "완료"
