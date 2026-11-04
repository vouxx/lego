-- PR 가드: GitHub App 으로 연결한 리포의 PR 마다 바뀐 줄을 점검하고 리뷰 코멘트·상태 체크를 남긴다.
-- 쓰기는 서버(secret 키)만, 읽기는 본인 것만.

alter table lego.projects
  add column pr_guard_enabled boolean not null default false;

create table lego.pr_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  pr_number integer not null check (pr_number > 0),
  pr_title text not null default '',
  pr_url text,
  head_sha text not null check (head_sha ~ '^[0-9a-f]{40}$'),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed')),
  -- {files, counts:{critical,high,medium,low}, conclusion, llm, note, posted:{review, check}}
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, pr_number, head_sha)
);
create index on lego.pr_reviews (project_id, created_at desc);
create index on lego.pr_reviews (user_id);

create table lego.pr_review_findings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references lego.pr_reviews (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  -- SEC-xxx(보안 규칙) 또는 PR-xxx(PR 규칙)
  rule_id text not null check (rule_id ~ '^(SEC|PR)-[0-9]{3}$'),
  rule_title text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  file_path text not null,
  line integer not null check (line > 0),
  -- 비밀값을 가린 문제 줄
  snippet text not null default '',
  reason text not null,
  ai_verdict text check (ai_verdict in ('true_positive', 'false_positive', 'uncertain')),
  explanation text,
  fix_prompt text,
  created_at timestamptz not null default now()
);
create index on lego.pr_review_findings (review_id);

alter table lego.llm_calls
  add column pr_review_id uuid references lego.pr_reviews (id) on delete set null;

grant select on lego.pr_reviews, lego.pr_review_findings to authenticated;
grant all on lego.pr_reviews, lego.pr_review_findings to service_role;
-- PR 가드 켜기/끄기는 Server Action 이 소유자를 확인한 뒤 secret 키로 바꾼다.

alter table lego.pr_reviews enable row level security;
alter table lego.pr_review_findings enable row level security;

create policy "own pr reviews: read" on lego.pr_reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own pr review findings: read" on lego.pr_review_findings
  for select to authenticated using (user_id = (select auth.uid()));
