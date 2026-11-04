-- 학습 도우미(4단계)와 세션 회고(5단계)를 없앤다. 개념 사전(concepts)은 점검 결과 설명용으로 남긴다.
-- 비공개 버킷 lego-sessions 는 Storage API 로만 지울 수 있어 남겨 둔다(파일 없음).
-- pg_trgm 확장은 extensions 스키마에 있고 다른 앱이 쓸 수 있어 그대로 둔다.

alter table lego.llm_calls drop column if exists explanation_id;
alter table lego.llm_calls drop column if exists session_id;

drop table if exists lego.session_reports;
drop table if exists lego.session_likes;
drop table if exists lego.session_insights;
drop table if exists lego.sessions;
drop function if exists lego.sync_session_like_count();
drop function if exists lego.hide_reported_session();

drop table if exists lego.quiz_attempts;
drop table if exists lego.quizzes;
drop table if exists lego.user_concepts;
drop table if exists lego.explanations;
