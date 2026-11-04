-- PR 가드 엄격도: 상태 체크를 실패로 둘 심각도와 줄 코멘트를 달 심각도를 정한다.
--   strict  : medium 이상이면 실패, 모든 문제에 코멘트
--   normal  : high 이상이면 실패, 모든 문제에 코멘트(기본)
--   relaxed : critical 만 실패, low 는 코멘트 없이 체크 요약·레고 화면에만
alter table lego.projects
  add column pr_guard_strictness text not null default 'normal'
    check (pr_guard_strictness in ('strict', 'normal', 'relaxed'));
