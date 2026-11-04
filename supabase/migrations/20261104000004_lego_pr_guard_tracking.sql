-- PR 가드 2차: 커밋이 쌓여도 같은 코멘트를 반복하지 않고, 고친 것은 해결 처리, /lego ignore 로 무시.
-- 같은 문제는 fingerprint(규칙 + 파일 + 코드 줄, 줄 번호 제외)로 알아본다.

alter table lego.pr_reviews
  add column check_run_id bigint;

alter table lego.pr_review_findings
  add column fingerprint text not null default '',
  -- 이 문제에 단 GitHub 줄 코멘트(처음 단 리뷰의 것을 다음 커밋에도 이어 쓴다)
  add column github_comment_id bigint,
  add column state text not null default 'open' check (state in ('open', 'ignored')),
  add column ignore_reason text,
  add column ignored_by text;

create index on lego.pr_review_findings (github_comment_id) where github_comment_id is not null;
create index on lego.pr_review_findings (review_id, fingerprint);
