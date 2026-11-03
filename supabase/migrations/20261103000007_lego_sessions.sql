-- 5단계 세션 회고·공유 (docs/design.md '5단계: 세션 회고·공유').
-- 원본 로그는 서버로 보내지 않는다. 브라우저에서 공통 형식으로 바꾸고 마스킹한 JSON 만
-- 비공개 Storage 버킷(lego-sessions)에 올라간다. 공개 세션은 서버가 visibility 를 확인한 뒤 secret 키로 읽는다
-- (공유 프로젝트라 anon 에 lego 스키마를 열지 않는다).

create extension if not exists pg_trgm with schema extensions;

create table lego.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  project_id uuid references lego.projects (id) on delete set null,
  tool text not null check (tool in ('claude_code', 'cursor', 'text')),
  title text not null default '',
  goal text,
  outcome text,
  tags text[] not null default '{}',
  visibility text not null default 'private'
    check (visibility in ('private', 'unlisted', 'public')),
  slug text unique,
  storage_path text not null,
  stats jsonb not null default '{}'::jsonb,
  status text not null default 'uploading'
    check (status in ('uploading', 'queued', 'analyzing', 'done', 'failed')),
  error text,
  hidden boolean not null default false,
  like_count integer not null default 0,
  analysis_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on lego.sessions (user_id, created_at desc);
create index on lego.sessions (visibility, created_at desc) where visibility = 'public' and not hidden;
create index on lego.sessions using gin (tags);
create index sessions_title_trgm on lego.sessions using gin (title extensions.gin_trgm_ops);

create table lego.session_insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lego.sessions (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  kind text not null check (kind in ('good_prompt', 'stuck', 'lesson')),
  content text not null,
  prompt_text text,
  turn_index integer,
  sort_order integer not null default 0
);
create index on lego.session_insights (session_id, sort_order);
create index session_insights_content_trgm on lego.session_insights
  using gin (content extensions.gin_trgm_ops);

create table lego.session_likes (
  session_id uuid not null references lego.sessions (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table lego.session_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references lego.sessions (id) on delete cascade,
  reporter_id uuid not null references lego.profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'hidden', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (session_id, reporter_id)
);

alter table lego.llm_calls
  add column session_id uuid references lego.sessions (id) on delete set null;

-- 좋아요 수는 트리거로 맞춘다(갤러리 정렬용).
create function lego.sync_session_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update lego.sessions s
  set like_count = (select count(*) from lego.session_likes l where l.session_id = s.id)
  where s.id = coalesce(new.session_id, old.session_id);
  return null;
end;
$$;
create trigger session_likes_count
  after insert or delete on lego.session_likes
  for each row execute function lego.sync_session_like_count();

-- 신고가 3건 쌓이면 갤러리에서 숨긴다(검토 전까지).
create function lego.hide_reported_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update lego.sessions
  set hidden = true
  where id = new.session_id
    and (select count(*) from lego.session_reports r
         where r.session_id = new.session_id and r.status = 'open') >= 3;
  return null;
end;
$$;
create trigger session_reports_hide
  after insert on lego.session_reports
  for each row execute function lego.hide_reported_session();

revoke execute on function lego.sync_session_like_count(), lego.hide_reported_session()
  from public, anon, authenticated;

-- 권한 ----------------------------------------------------------------------
grant select on lego.sessions, lego.session_insights, lego.session_likes to authenticated;
grant all on lego.sessions, lego.session_insights, lego.session_likes,
  lego.session_reports to service_role;

alter table lego.sessions enable row level security;
alter table lego.session_insights enable row level security;
alter table lego.session_likes enable row level security;
alter table lego.session_reports enable row level security;

create policy "own sessions: read" on lego.sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own session insights: read" on lego.session_insights
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own likes: read" on lego.session_likes
  for select to authenticated using (user_id = (select auth.uid()));
-- session_reports: 정책 없음 = service_role 만.

-- Storage -------------------------------------------------------------------
-- 비공개 버킷. 업로드는 서버가 발급한 서명 URL 로만, 읽기는 서버가 secret 키로만 한다(정책 없음).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lego-sessions', 'lego-sessions', false, 5000000, array['application/json'])
on conflict (id) do nothing;
