-- 운영 상태 점검: 배포된 사이트와 그 Supabase 를 밖에서 공격자가 보는 그대로 확인한다.
-- 소유 확인(사이트에 토큰 파일)을 마친 대상만 점검한다. Supabase 주소·공개 키는 배포된 JS 에서 찾는다.

create table lego.live_targets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  site_url text not null check (site_url ~ '^https?://'),
  verify_token text not null check (char_length(verify_token) >= 24),
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on lego.live_targets (user_id);
create index on lego.live_targets (last_checked_at) where verified_at is not null;

create table lego.live_checks (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references lego.live_targets (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  trigger text not null default 'manual' check (trigger in ('manual', 'daily')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  -- [{id, severity, title, target, detail, fix, isNew}] 응답 내용(행·파일)은 저장하지 않는다.
  results jsonb not null default '[]'::jsonb,
  -- {requests, supabase: 'found'|'not_found', tables, buckets, notes[]}
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on lego.live_checks (target_id, created_at desc);

grant select on lego.live_targets, lego.live_checks to authenticated;
grant all on lego.live_targets, lego.live_checks to service_role;

alter table lego.live_targets enable row level security;
alter table lego.live_checks enable row level security;

create policy "own live targets: read" on lego.live_targets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own live checks: read" on lego.live_checks
  for select to authenticated using (user_id = (select auth.uid()));

-- 하루 한 번 운영 점검: 점검할 대상이 있으면 같은 워커(/api/scan-worker)를 부른다. 워커가 스캔 큐와 함께 처리한다.
create or replace function lego.kick_scan_worker()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from pgmq.q_lego_scan_jobs where vt <= now())
     and not exists (
       select 1 from lego.live_targets
       where verified_at is not null
         and (last_checked_at is null or last_checked_at < now() - interval '24 hours')
     ) then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'lego_scan_worker_url';
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'lego_scan_worker_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke execute on function lego.kick_scan_worker() from public, anon, authenticated;
