-- 2주차: 스캔 작업 큐, 사용량 한도, 진행률 실시간 전송.
-- pgmq 확장은 프로젝트 전체에 설치되지만 큐 이름(lego_scan_jobs)과 래퍼 함수는 레고 것만 쓴다.

create extension if not exists pgmq;
select pgmq.create('lego_scan_jobs');

-- 큐 래퍼. supabase-js 는 lego 스키마 rpc 로만 부르고, service_role 만 실행할 수 있다.
create function lego.enqueue_scan(p_scan_id uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select * from pgmq.send('lego_scan_jobs', jsonb_build_object('scan_id', p_scan_id));
$$;

create function lego.read_scan_jobs(p_qty integer, p_visibility_seconds integer)
returns table (msg_id bigint, read_ct integer, scan_id uuid)
language sql
security definer
set search_path = ''
as $$
  select m.msg_id, m.read_ct, (m.message ->> 'scan_id')::uuid
  from pgmq.read('lego_scan_jobs', p_visibility_seconds, p_qty) as m;
$$;

create function lego.ack_scan_job(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.delete('lego_scan_jobs', p_msg_id);
$$;

-- 재시도 한도를 넘긴 작업은 지우지 않고 보관한다(원인 조사용).
create function lego.archive_scan_job(p_msg_id bigint)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pgmq.archive('lego_scan_jobs', p_msg_id);
$$;

-- 사용량 한도 ------------------------------------------------------------------
-- 기간은 한국 시간 기준 월. 한도 안이면 1 늘리고 true, 넘으면 false. UPDATE 한 번이라 동시 요청에도 안전하다.
create function lego.consume_scan_quota(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  v_ok boolean;
begin
  insert into lego.usage_quotas (user_id, period)
  values (p_user_id, v_period)
  on conflict (user_id, period) do nothing;

  update lego.usage_quotas
  set scans_used = scans_used + 1
  where user_id = p_user_id and period = v_period and scans_used < scans_limit
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

-- LLM 토큰 사용량을 더하고, 남은 토큰이 있는지 돌려준다.
create function lego.add_token_usage(p_user_id uuid, p_tokens bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period text := to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  v_remaining boolean;
begin
  insert into lego.usage_quotas (user_id, period)
  values (p_user_id, v_period)
  on conflict (user_id, period) do nothing;

  update lego.usage_quotas
  set tokens_used = tokens_used + greatest(p_tokens, 0)
  where user_id = p_user_id and period = v_period
  returning tokens_used < tokens_limit into v_remaining;

  return coalesce(v_remaining, false);
end;
$$;

revoke execute on function
  lego.enqueue_scan(uuid),
  lego.read_scan_jobs(integer, integer),
  lego.ack_scan_job(bigint),
  lego.archive_scan_job(bigint),
  lego.consume_scan_quota(uuid),
  lego.add_token_usage(uuid, bigint)
from public, anon, authenticated;

grant execute on function
  lego.enqueue_scan(uuid),
  lego.read_scan_jobs(integer, integer),
  lego.ack_scan_job(bigint),
  lego.archive_scan_job(bigint),
  lego.consume_scan_quota(uuid),
  lego.add_token_usage(uuid, bigint)
to service_role;

-- 실시간 진행률 ---------------------------------------------------------------
-- RLS 가 적용되므로 사용자는 자기 스캔 변경만 받는다.
alter publication supabase_realtime add table lego.scans;

-- 직전 스캔 조회용
create index on lego.scans (project_id, status, created_at desc);
