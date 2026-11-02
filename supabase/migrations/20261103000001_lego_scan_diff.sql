-- 스캔 이력 비교. fingerprint 로 같은 프로젝트의 직전 완료 스캔과 비교한다.
-- security invoker 라 RLS 가 그대로 적용되어 본인 스캔만 비교된다.
-- AI 가 오탐으로 판단한 항목은 비교에서 뺀다.

create or replace function lego.previous_scan_id(p_scan_id uuid)
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select prev.id
  from lego.scans cur
  join lego.scans prev
    on prev.project_id = cur.project_id
   and prev.status = 'done'
   and prev.created_at < cur.created_at
  where cur.id = p_scan_id
  order by prev.created_at desc
  limit 1
$$;

-- change: new(이번에 처음 보임) / unchanged(직전에도 있었음) / fixed(직전엔 있었는데 사라짐)
-- fixed 의 finding_id 는 직전 스캔의 항목이다. 직전 스캔이 없으면 빈 결과.
create or replace function lego.scan_diff(p_scan_id uuid)
returns table (
  change text,
  finding_id uuid,
  fingerprint text,
  rule_id text,
  severity text,
  file_path text,
  line_start integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with prev as (
    select lego.previous_scan_id(p_scan_id) as id
  ),
  cur_f as (
    select f.* from lego.findings f
    where f.scan_id = p_scan_id
      and f.ai_verdict is distinct from 'false_positive'
  ),
  prev_f as (
    select f.* from lego.findings f, prev
    where f.scan_id = prev.id
      and f.ai_verdict is distinct from 'false_positive'
  )
  select
    case when exists (select 1 from prev_f p where p.fingerprint = c.fingerprint)
      then 'unchanged' else 'new' end,
    c.id, c.fingerprint, c.rule_id, c.severity, c.file_path, c.line_start
  from cur_f c, prev
  where prev.id is not null
  union all
  select 'fixed', p.id, p.fingerprint, p.rule_id, p.severity, p.file_path, p.line_start
  from prev_f p
  where not exists (select 1 from cur_f c where c.fingerprint = p.fingerprint)
$$;

revoke execute on function lego.previous_scan_id(uuid) from public, anon;
revoke execute on function lego.scan_diff(uuid) from public, anon;
grant execute on function lego.previous_scan_id(uuid) to authenticated, service_role;
grant execute on function lego.scan_diff(uuid) to authenticated, service_role;
