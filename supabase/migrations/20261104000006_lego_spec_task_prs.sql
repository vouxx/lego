-- 스펙 작업 ↔ PR: PR 제목·브랜치 이름의 [T-n] 으로 작업과 PR 을 잇는다.
-- PR 상태(열림·닫힘·머지됨)와 PR 가드 체크 결론을 보여 주고, 머지되면 작업을 완료한다.
-- 쓰기는 서버(webhook·PR 가드 워커)만, 읽기는 본인 것만.

create table lego.spec_task_prs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references lego.spec_tasks (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  repo_full_name text not null,
  pr_number integer not null check (pr_number > 0),
  pr_title text not null default '',
  pr_url text,
  state text not null default 'open' check (state in ('open', 'closed', 'merged')),
  -- PR 가드를 켠 프로젝트면 마지막 체크 결론
  check_conclusion text check (check_conclusion in ('success', 'neutral', 'failure')),
  updated_at timestamptz not null default now(),
  unique (task_id, pr_number)
);
create index on lego.spec_task_prs (repo_full_name, pr_number);
create index on lego.spec_task_prs (user_id);

grant select on lego.spec_task_prs to authenticated;
grant all on lego.spec_task_prs to service_role;

alter table lego.spec_task_prs enable row level security;

create policy "own spec task prs: read" on lego.spec_task_prs
  for select to authenticated using (user_id = (select auth.uid()));
