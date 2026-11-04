-- 규칙별 오탐 피드백: AI 가 오탐으로 본 것, 사용자가 무시한 것(점검 결과 '무시', PR 가드 /lego ignore)을 모은다.
-- 같은 문제가 스캔·커밋마다 반복 저장되므로 (프로젝트, fingerprint) 하나를 한 건으로 센다.
-- 관리자 화면에서 secret 키(service_role)로만 부른다.

create function lego.rule_feedback()
returns table (
  rule_id text,
  rule_title text,
  source text,
  total bigint,
  ai_false_positive bigint,
  ai_uncertain bigint,
  user_ignored bigint
)
language sql
stable
set search_path = ''
as $$
  with scan_items as (
    select f.rule_id,
           s.project_id,
           f.fingerprint,
           bool_or(f.ai_verdict = 'false_positive') as fp,
           bool_or(f.ai_verdict = 'uncertain') as uncertain,
           bool_or(f.status = 'ignored') as ignored
    from lego.findings f
    join lego.scans s on s.id = f.scan_id
    group by f.rule_id, s.project_id, f.fingerprint
  ),
  pr_items as (
    select f.rule_id,
           max(f.rule_title) as rule_title,
           r.project_id,
           r.pr_number,
           f.fingerprint,
           bool_or(f.ai_verdict = 'false_positive') as fp,
           bool_or(f.ai_verdict = 'uncertain') as uncertain,
           bool_or(f.state = 'ignored') as ignored
    from lego.pr_review_findings f
    join lego.pr_reviews r on r.id = f.review_id
    where f.fingerprint is not null
    group by f.rule_id, r.project_id, r.pr_number, f.fingerprint
  )
  select i.rule_id,
         coalesce(ru.title, i.rule_id),
         'scan',
         count(*),
         count(*) filter (where i.fp),
         count(*) filter (where i.uncertain),
         count(*) filter (where i.ignored)
  from scan_items i
  left join lego.rules ru on ru.id = i.rule_id
  group by i.rule_id, ru.title
  union all
  select i.rule_id,
         max(i.rule_title),
         'pr',
         count(*),
         count(*) filter (where i.fp),
         count(*) filter (where i.uncertain),
         count(*) filter (where i.ignored)
  from pr_items i
  group by i.rule_id;
$$;

revoke all on function lego.rule_feedback() from public, anon, authenticated;
grant execute on function lego.rule_feedback() to service_role;
