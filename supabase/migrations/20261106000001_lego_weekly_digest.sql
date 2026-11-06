-- 주간 요약 Slack 메시지. 매주 월요일 00:00 UTC(09:00 KST) 뒤 첫 워커 호출에서 보낸다.
-- 기본값 now() 라서 새로 연결한 채널은 다음 월요일부터 받는다.

alter table lego.slack_connections
  add column notify_weekly boolean not null default true,
  add column last_weekly_at timestamptz not null default now();

grant select (notify_weekly) on lego.slack_connections to authenticated;

create index on lego.slack_connections (last_weekly_at) where notify_weekly;

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
     )
     and not exists (
       select 1 from lego.slack_connections
       where notify_weekly
         and last_weekly_at < pg_catalog.date_trunc('week', now(), 'UTC')
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
