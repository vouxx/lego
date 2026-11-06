-- 팀 멤버 초대(보기 전용). 소유자가 GitHub 아이디로 초대 링크를 만들고, 그 계정이 수락하면 멤버가 된다.
--
-- lego.projects 의 읽기 정책은 일부러 넓히지 않는다. 쓰기 전 소유 확인이 projects 를 RLS 로
-- 읽는 방식(findMyProject)이라, 여기를 열면 멤버가 쓰기까지 하게 된다. 멤버 화면의 프로젝트 정보는
-- 서버가 멤버십을 확인한 뒤 secret 키로 읽는다(features/members/services/access.ts).
-- 규칙 파일·스펙·Slack 연결은 멤버에게 열지 않는다.

create table lego.project_members (
  project_id uuid not null references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  github_login text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on lego.project_members (user_id);

-- 토큰 원문은 저장하지 않는다. 수락하면 행을 지워 한 번만 쓰이게 한다.
create table lego.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references lego.projects (id) on delete cascade,
  invited_by uuid not null references lego.profiles (id) on delete cascade,
  github_login text not null check (github_login = lower(github_login)),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (project_id, github_login)
);

grant select on lego.project_members to authenticated;
grant select (id, project_id, invited_by, github_login, expires_at, created_at)
  on lego.project_invites to authenticated;
grant all on lego.project_members, lego.project_invites to service_role;

alter table lego.project_members enable row level security;
alter table lego.project_invites enable row level security;

create policy "own membership or owned project: read" on lego.project_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or project_id in (select p.id from lego.projects p where p.user_id = (select auth.uid()))
  );

create policy "owned project invites: read" on lego.project_invites
  for select to authenticated
  using (project_id in (select p.id from lego.projects p where p.user_id = (select auth.uid())));

-- 멤버가 읽을 수 있는 결과. 상태 변경(findings update)·쓰기 정책은 소유자 그대로다.
create policy "shared scans: read" on lego.scans
  for select to authenticated
  using (project_id in (
    select m.project_id from lego.project_members m where m.user_id = (select auth.uid())
  ));

create policy "shared findings: read" on lego.findings
  for select to authenticated
  using (scan_id in (
    select s.id from lego.scans s
    join lego.project_members m on m.project_id = s.project_id
    where m.user_id = (select auth.uid())
  ));

create policy "shared pr reviews: read" on lego.pr_reviews
  for select to authenticated
  using (project_id in (
    select m.project_id from lego.project_members m where m.user_id = (select auth.uid())
  ));

create policy "shared pr review findings: read" on lego.pr_review_findings
  for select to authenticated
  using (review_id in (
    select r.id from lego.pr_reviews r
    join lego.project_members m on m.project_id = r.project_id
    where m.user_id = (select auth.uid())
  ));

create policy "shared live targets: read" on lego.live_targets
  for select to authenticated
  using (project_id in (
    select m.project_id from lego.project_members m where m.user_id = (select auth.uid())
  ));

create policy "shared live checks: read" on lego.live_checks
  for select to authenticated
  using (target_id in (
    select t.id from lego.live_targets t
    join lego.project_members m on m.project_id = t.project_id
    where m.user_id = (select auth.uid())
  ));

-- 초대 수락: 쓰인 초대는 지우고 멤버를 넣는다. 만료됐거나 다른 계정이면 null.
create function lego.accept_project_invite(
  p_token_hash text,
  p_user_id uuid,
  p_login text,
  p_avatar text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_project uuid;
begin
  delete from lego.project_invites
  where token_hash = p_token_hash
    and expires_at > now()
    and github_login = lower(p_login)
  returning project_id into v_project;
  if v_project is null then
    return null;
  end if;

  insert into lego.project_members (project_id, user_id, github_login, avatar_url)
  values (v_project, p_user_id, p_login, p_avatar)
  on conflict (project_id, user_id) do update
    set github_login = excluded.github_login, avatar_url = excluded.avatar_url;
  return v_project;
end;
$$;
revoke execute on function lego.accept_project_invite(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function lego.accept_project_invite(text, uuid, text, text) to service_role;
