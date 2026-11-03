-- 공개 리포는 GitHub App 설치 없이 URL 만으로 등록한다.
-- installation_id 가 null 이면 공개 리포(git refs + codeload tarball 로 읽음),
-- 값이 있으면 그 설치 토큰으로 읽는다(비공개 리포 포함).
alter table lego.projects alter column installation_id drop not null;

comment on column lego.projects.installation_id is
  'GitHub App 설치 id. null 이면 설치 없이 등록한 공개 리포.';
