-- 1단계 보안 점검 규칙 14개 (docs/design.md '보안 점검 규칙').
-- SEC-014 는 의존성 취약점 등급에 따라 심각도가 달라지므로 기본값을 high 로 둔다.

insert into lego.rules (id, title, category, severity, detector) values
  ('SEC-001', '코드에 하드코딩된 API 키/토큰', 'secrets', 'critical', 'regex'),
  ('SEC-002', '.env 파일이 커밋됨 / .gitignore 에 누락', 'secrets', 'critical', 'file-tree'),
  ('SEC-003', 'NEXT_PUBLIC_ / VITE_ 접두사가 붙은 비밀 키', 'secrets', 'critical', 'regex'),
  ('SEC-004', 'Supabase service_role 키를 클라이언트 코드에서 사용', 'secrets', 'critical', 'ast'),
  ('SEC-005', '테이블 생성 후 RLS 미활성화', 'database', 'high', 'sql'),
  ('SEC-006', 'RLS 정책이 using (true) 로 전체 허용', 'database', 'high', 'sql'),
  ('SEC-007', '인증 확인 없는 Route Handler / Server Action', 'auth', 'high', 'ast'),
  ('SEC-008', '사용자 입력을 문자열로 이어 붙인 SQL', 'injection', 'high', 'ast'),
  ('SEC-009', '다른 사용자의 id 로 조회/수정 가능 (IDOR)', 'auth', 'high', 'llm'),
  ('SEC-010', 'dangerouslySetInnerHTML 에 살균되지 않은 값', 'injection', 'medium', 'ast'),
  ('SEC-011', 'CORS Access-Control-Allow-Origin: * + 인증 쿠키', 'config', 'medium', 'regex'),
  ('SEC-012', 'webhook 서명 검증 누락 (Stripe, GitHub)', 'auth', 'medium', 'ast'),
  ('SEC-013', 'LLM API 호출에 사용량 제한 없음', 'cost', 'medium', 'llm'),
  ('SEC-014', '알려진 취약점이 있는 의존성 버전', 'dependencies', 'high', 'lockfile')
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  severity = excluded.severity,
  detector = excluded.detector;
