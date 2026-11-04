-- 사용자용 Slack 알림: "Slack 에 추가"(OAuth, incoming-webhook) 로 프로젝트마다 채널 하나를 잇는다.
-- webhook_url 은 그 채널에 글을 쓸 수 있는 비밀값이라 사용자 세션으로는 읽을 수 없게 열 권한에서 뺀다.
-- 쓰기는 서버(secret 키)만.

create table lego.slack_connections (
  project_id uuid primary key references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  team_id text not null,
  team_name text not null default '',
  channel_id text not null,
  channel_name text not null default '',
  -- 운영에서는 앱이 https://hooks.slack.com 만 받는다(로컬 E2E 는 모의 서버 http://localhost).
  webhook_url text not null check (webhook_url ~ '^https?://'),
  -- 무엇을 알릴지
  notify_live boolean not null default true,
  notify_guard boolean not null default true,
  notify_scan boolean not null default false,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on lego.slack_connections (user_id);

grant select (
  project_id, user_id, team_id, team_name, channel_id, channel_name,
  notify_live, notify_guard, notify_scan, last_error, created_at, updated_at
) on lego.slack_connections to authenticated;
grant all on lego.slack_connections to service_role;

alter table lego.slack_connections enable row level security;

create policy "own slack connections: read" on lego.slack_connections
  for select to authenticated using (user_id = (select auth.uid()));
