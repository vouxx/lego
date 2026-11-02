-- 배포된 워커(/api/scan-worker)를 pg_cron 으로 주기적으로 부른다.
-- after() 로 바로 처리하지 못한 작업(서버 재시작, 재시도 대기)을 줍기 위한 것이다.
-- URL 과 비밀값은 저장소에 두지 않고 Vault 에 넣는다(마이그레이션 밖에서 한 번):
--   select vault.create_secret('<https://…/api/scan-worker>', 'lego_scan_worker_url');
--   select vault.create_secret('<SCAN_WORKER_SECRET>', 'lego_scan_worker_secret');
-- 둘 중 하나라도 없거나, 처리할 작업이 없으면 아무것도 호출하지 않는다.

create extension if not exists pg_cron;
create extension if not exists pg_net;

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
  -- 지금 읽을 수 있는(처리 중이 아닌) 작업이 있을 때만 부른다.
  if not exists (select 1 from pgmq.q_lego_scan_jobs where vt <= now()) then
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

select cron.schedule(
  'lego-scan-worker',
  '*/5 * * * *',
  'select lego.kick_scan_worker()'
);
