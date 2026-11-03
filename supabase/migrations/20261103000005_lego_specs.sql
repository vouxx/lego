-- 3단계 스펙 변환기 (docs/design.md '3단계: 스펙 변환기').
-- 리포 없이도 시작할 수 있게 specs.project_id 는 nullable 이다(projects 를 바꾸지 않는다).

create table lego.specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  project_id uuid references lego.projects (id) on delete set null,
  idea text not null check (char_length(idea) between 2 and 2000),
  title text,
  -- 확인 질문 [{id, question, options[], allowCustom}] 과 답변 {questionId: answer}
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  prd_md text,
  -- CLAUDE.md '프로젝트 개요'에 들어갈 3~5줄 요약
  overview text,
  -- 설계: {tables:[{name, purpose, columns:[{name,type,note}], relations[]}]} / [{path, name, purpose}]
  data_model jsonb,
  screens jsonb,
  stack_tags text[] not null default '{}',
  -- 2단계 생성기 규칙 팩으로 만든 CLAUDE.md 초안
  context_md text,
  version integer not null default 1,
  status text not null default 'questions'
    check (status in ('questions', 'generating', 'ready', 'failed')),
  progress jsonb not null default '{}'::jsonb,
  error text,
  generation_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on lego.specs (user_id, created_at desc);
create index on lego.specs (project_id);

create table lego.spec_tasks (
  id uuid primary key default gen_random_uuid(),
  spec_id uuid not null references lego.specs (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  -- 작업 ID: T-1, T-2 … 커밋 메시지의 [T-3] 으로 완료 처리한다.
  key text not null check (key ~ '^T-[0-9]+$'),
  seq integer not null,
  title text not null,
  description text not null default '',
  acceptance_criteria jsonb not null default '[]'::jsonb,
  depends_on text[] not null default '{}',
  prompt text not null default '',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  done_commit text,
  updated_at timestamptz not null default now(),
  unique (spec_id, key)
);
create index on lego.spec_tasks (spec_id, seq);

-- owner_id 가 null 이면 공용 템플릿.
create table lego.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references lego.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  source text not null default 'manual'
    check (source in ('fix_prompt', 'session_insight', 'task_prompt', 'manual')),
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index on lego.prompt_templates (owner_id);
create index on lego.prompt_templates using gin (tags);

alter table lego.llm_calls
  add column spec_id uuid references lego.specs (id) on delete set null;

-- 권한 ----------------------------------------------------------------------
grant select on lego.specs, lego.spec_tasks, lego.prompt_templates to authenticated;
grant all on lego.specs, lego.spec_tasks, lego.prompt_templates to service_role;

alter table lego.specs enable row level security;
alter table lego.spec_tasks enable row level security;
alter table lego.prompt_templates enable row level security;

create policy "own specs: read" on lego.specs
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own spec tasks: read" on lego.spec_tasks
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own or shared templates: read" on lego.prompt_templates
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
