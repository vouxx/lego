-- 보안 점검 후속 조치

-- 1. GitHub 설치를 사용자마다 따로 연결한다.
-- 설치에 접근할 수 있는 사람이 먼저 연결하면 실제 소유자가 막히던 문제를 없앤다.
-- 어떤 리포를 다룰 수 있는지는 연결 여부가 아니라 리포별 쓰기 권한으로 판단한다.
alter table lego.projects drop constraint projects_installation_id_fkey;
alter table lego.github_installations
  drop constraint github_installations_installation_id_key;
alter table lego.github_installations
  add constraint github_installations_user_installation_key
  unique (user_id, installation_id);
create index on lego.github_installations (installation_id);
alter table lego.projects
  add constraint projects_user_installation_fkey
  foreign key (user_id, installation_id)
  references lego.github_installations (user_id, installation_id)
  on delete cascade;

-- 2. 외부 기여자의 PR 은 소유자의 토큰을 쓰지 않는다(정적 규칙만 돌린다).
alter table lego.pr_reviews
  add column trusted_author boolean not null default false;
comment on column lego.pr_reviews.trusted_author is
  'PR 작성자가 OWNER/MEMBER/COLLABORATOR 인지. false 면 AI 판별과 스펙 범위 확인을 건너뛴다.';

-- 3. 주변 코드가 바뀌면 이전 AI 판정을 다시 쓰지 않는다.
alter table lego.pr_review_findings add column context_hash text;

-- 4. 초대 수락 시점에도 멤버 수 제한을 지킨다(여러 초대가 동시에 수락되는 경우).
create or replace function lego.accept_project_invite(
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

  perform 1 from lego.projects where id = v_project for update;
  if (select count(*) from lego.project_members where project_id = v_project) >= 10
     and not exists (
       select 1 from lego.project_members
       where project_id = v_project and user_id = p_user_id
     ) then
    return null;
  end if;

  insert into lego.project_members (project_id, user_id, github_login, avatar_url)
  values (v_project, p_user_id, p_login, p_avatar)
  on conflict (project_id, user_id) do update
    set github_login = excluded.github_login, avatar_url = excluded.avatar_url;
  return v_project;
end;
$$;
