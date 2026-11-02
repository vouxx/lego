-- 레고 1단계 기본 스키마.
-- 이 Supabase 프로젝트는 다른 앱(zeek, wbs, resume)과 같이 쓰므로 모든 객체를 lego 스키마에 둔다.
-- auth.users 에 트리거를 걸지 않는다(다른 앱 가입자까지 profiles 가 생기기 때문). profiles 는 /auth/callback 에서 upsert 한다.

create schema if not exists lego;

-- 마이그레이션 이력. supabase_migrations 는 다른 앱이 쓰므로 따로 기록한다(scripts/db-migrate.sh).
create table lego.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

-- profiles ------------------------------------------------------------------
create table lego.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  github_login text not null,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- github_installations ------------------------------------------------------
create table lego.github_installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  installation_id bigint not null unique,
  account_login text not null,
  created_at timestamptz not null default now()
);
create index on lego.github_installations (user_id);

-- projects ------------------------------------------------------------------
create table lego.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  installation_id bigint not null references lego.github_installations (installation_id) on delete cascade,
  repo_full_name text not null,
  default_branch text not null,
  detected_stack jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, repo_full_name)
);
create index on lego.projects (installation_id);

-- scans ---------------------------------------------------------------------
create table lego.scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  commit_sha text,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  progress smallint not null default 0 check (progress between 0 and 100),
  summary jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index on lego.scans (project_id, created_at desc);
create index on lego.scans (user_id);

-- rules (공용 마스터) ---------------------------------------------------------
create table lego.rules (
  id text primary key check (id ~ '^SEC-[0-9]{3}$'),
  title text not null,
  category text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  detector text not null check (detector in ('regex', 'ast', 'sql', 'file-tree', 'lockfile', 'llm')),
  enabled boolean not null default true
);

-- findings ------------------------------------------------------------------
create table lego.findings (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references lego.scans (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  rule_id text not null references lego.rules (id),
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  file_path text not null,
  line_start integer not null check (line_start > 0),
  line_end integer not null check (line_end >= line_start),
  snippet text not null, -- 저장 전 비밀값 마스킹 필수
  fingerprint text not null,
  ai_verdict text check (ai_verdict in ('true_positive', 'false_positive', 'uncertain')),
  explanation text,
  fix_prompt text,
  status text not null default 'open' check (status in ('open', 'ignored', 'resolved')),
  created_at timestamptz not null default now(),
  unique (scan_id, fingerprint)
);
create index on lego.findings (user_id, fingerprint);
create index on lego.findings (rule_id);

-- llm_calls -----------------------------------------------------------------
create table lego.llm_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  scan_id uuid references lego.scans (id) on delete set null,
  purpose text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  latency_ms integer,
  cached boolean not null default false,
  created_at timestamptz not null default now()
);
create index on lego.llm_calls (user_id, created_at desc);
create index on lego.llm_calls (scan_id);

-- usage_quotas --------------------------------------------------------------
create table lego.usage_quotas (
  user_id uuid not null references lego.profiles (id) on delete cascade,
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  scans_used integer not null default 0,
  tokens_used bigint not null default 0,
  scans_limit integer not null default 30,
  tokens_limit bigint not null default 2000000,
  primary key (user_id, period)
);

-- 권한 ----------------------------------------------------------------------
-- anon 은 lego 스키마에 접근하지 않는다. authenticated 는 RLS 로 자기 행만 읽는다.
-- 쓰기는 service_role(Server Action, 워커)만. 예외: findings.status.
grant usage on schema lego to authenticated, service_role;
grant all on all tables in schema lego to service_role;
grant select on all tables in schema lego to authenticated;
revoke all on lego.schema_migrations from authenticated;
grant update (status) on lego.findings to authenticated;
alter default privileges in schema lego grant all on tables to service_role;

-- RLS -----------------------------------------------------------------------
alter table lego.schema_migrations enable row level security;
alter table lego.profiles enable row level security;
alter table lego.github_installations enable row level security;
alter table lego.projects enable row level security;
alter table lego.scans enable row level security;
alter table lego.rules enable row level security;
alter table lego.findings enable row level security;
alter table lego.llm_calls enable row level security;
alter table lego.usage_quotas enable row level security;

create policy "own profile: read" on lego.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "own installations: read" on lego.github_installations
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own projects: read" on lego.projects
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own scans: read" on lego.scans
  for select to authenticated using (user_id = (select auth.uid()));

create policy "enabled rules: read" on lego.rules
  for select to authenticated using (enabled);

create policy "own findings: read" on lego.findings
  for select to authenticated using (user_id = (select auth.uid()));

-- 컬럼 권한으로 status 만 바꿀 수 있다.
create policy "own findings: update status" on lego.findings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own llm calls: read" on lego.llm_calls
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own quotas: read" on lego.usage_quotas
  for select to authenticated using (user_id = (select auth.uid()));
