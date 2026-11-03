-- 4단계 학습 도우미 (docs/design.md '4단계: 학습 도우미').
-- 개념 사전은 공개 페이지(/concepts)에서 서버가 secret 키로 읽는다. anon 에는 lego 스키마를 열지 않는다.

create table lego.concepts (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text not null,
  body_md text not null,
  related_rule_ids text[] not null default '{}',
  sort_order integer not null default 0
);

create table lego.explanations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lego.profiles (id) on delete cascade,
  project_id uuid references lego.projects (id) on delete set null,
  source text not null check (source in ('paste', 'file', 'finding')),
  -- file: "owner/repo@sha:path#L10-L40", finding: finding id
  source_ref text,
  code_hash text not null,
  level text not null check (level in ('beginner_nondev', 'beginner', 'intermediate')),
  -- 비밀값을 가린 코드
  code text not null,
  language text,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index on lego.explanations (user_id, created_at desc);
create index on lego.explanations (code_hash, level);

create table lego.quizzes (
  id uuid primary key default gen_random_uuid(),
  explanation_id uuid not null unique references lego.explanations (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  -- [{question, options[], answerIndex, explanation}]
  questions jsonb not null
);

create table lego.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references lego.quizzes (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  answers jsonb not null,
  score numeric(4, 3) not null check (score between 0 and 1),
  created_at timestamptz not null default now()
);
create index on lego.quiz_attempts (quiz_id, created_at desc);

create table lego.user_concepts (
  user_id uuid not null references lego.profiles (id) on delete cascade,
  concept_slug text not null references lego.concepts (slug) on delete cascade,
  mastery integer not null default 0 check (mastery between 0 and 100),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, concept_slug)
);

alter table lego.llm_calls
  add column explanation_id uuid references lego.explanations (id) on delete set null;

-- 권한 ----------------------------------------------------------------------
grant select on lego.concepts, lego.explanations, lego.quizzes,
  lego.quiz_attempts, lego.user_concepts to authenticated;
grant all on lego.concepts, lego.explanations, lego.quizzes,
  lego.quiz_attempts, lego.user_concepts to service_role;

alter table lego.concepts enable row level security;
alter table lego.explanations enable row level security;
alter table lego.quizzes enable row level security;
alter table lego.quiz_attempts enable row level security;
alter table lego.user_concepts enable row level security;

create policy "concepts: read" on lego.concepts
  for select to authenticated using (auth.uid() is not null);
create policy "own explanations: read" on lego.explanations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own quizzes: read" on lego.quizzes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own quiz attempts: read" on lego.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own concepts: read" on lego.user_concepts
  for select to authenticated using (user_id = (select auth.uid()));

-- 개념 사전 ------------------------------------------------------------------
-- 보안 규칙 14개가 모두 개념 하나 이상에 연결된다(SEC-005·006 → rls).
insert into lego.concepts (slug, title, summary, body_md, related_rule_ids, sort_order) values
('hardcoded-secrets', '하드코딩된 비밀값', 'API 키나 토큰을 코드에 직접 쓰면 코드를 보는 누구나 그 키를 쓸 수 있습니다.',
$md$## 무엇인가요
API 키, 데이터베이스 비밀번호, 액세스 토큰 같은 값을 코드 파일에 그대로 적어 두는 것입니다.

## 왜 위험한가요
- 코드가 GitHub 에 올라가는 순간 키도 같이 공개됩니다. 공개 리포를 훑어 키를 수집하는 봇은 몇 분 안에 찾아냅니다.
- 비공개 리포라도 협업자, 노트북 분실, 로그 유출로 새어 나갈 수 있습니다.
- 커밋 기록에 남기 때문에 나중에 코드에서 지워도 기록에서 다시 꺼낼 수 있습니다.

## 어떻게 막나요
1. 값은 `.env.local` 같은 환경 변수 파일에 두고 `process.env.KEY` 로 읽습니다.
2. 환경 변수 파일은 `.gitignore` 에 넣습니다.
3. 이미 커밋했다면 **키를 발급처에서 폐기하고 새로 발급**합니다. 코드만 지우는 것으로는 부족합니다.$md$,
'{SEC-001}', 10),
('env-files', '.env 파일과 .gitignore', '.env 파일에는 비밀값이 들어 있어서 리포에 올리면 안 됩니다.',
$md$## 무엇인가요
`.env`, `.env.local` 은 환경 변수를 모아 둔 파일입니다. 앱이 실행될 때 이 값을 읽어 씁니다.

## 왜 위험한가요
`.gitignore` 에 빠져 있으면 `git add .` 한 번에 모든 비밀값이 리포에 올라갑니다.

## 어떻게 막나요
- `.gitignore` 에 `.env*` 를 넣고, 예시 파일은 `.env.example` 처럼 값 없이 이름만 둡니다.
- 이미 올라갔다면 파일을 지우고 안에 있던 키를 모두 새로 발급합니다.$md$,
'{SEC-002}', 20),
('public-env-prefix', 'NEXT_PUBLIC_ / VITE_ 환경 변수', '이 접두사가 붙은 환경 변수는 브라우저로 보내져서 누구나 볼 수 있습니다.',
$md$## 무엇인가요
Next.js 는 `NEXT_PUBLIC_`, Vite 는 `VITE_` 로 시작하는 환경 변수를 클라이언트 코드(브라우저에서 실행되는 JS)에 그대로 넣습니다.

## 왜 위험한가요
비밀 키에 이 접두사를 붙이면 사이트에 접속한 누구나 개발자 도구로 키를 꺼낼 수 있습니다.

## 어떻게 막나요
- 공개돼도 되는 값(Supabase URL, publishable/anon 키)에만 접두사를 붙입니다.
- 비밀 키는 접두사 없이 두고 서버 코드(Server Action, Route Handler)에서만 읽습니다.$md$,
'{SEC-003}', 30),
('service-role-key', 'Supabase service_role 키', 'service_role(secret) 키는 RLS 를 무시하므로 서버에서만 써야 합니다.',
$md$## 무엇인가요
Supabase 의 service_role 키(새 이름: secret 키)는 관리자 권한 키입니다. RLS 정책을 모두 건너뜁니다.

## 왜 위험한가요
브라우저 코드에 들어가면 누구나 모든 사용자의 데이터를 읽고, 고치고, 지울 수 있습니다.

## 어떻게 막나요
- `"use client"` 파일이나 `NEXT_PUBLIC_` 변수에 넣지 않습니다.
- 서버에서 쓸 때도 먼저 "이 사용자가 이 행에 접근해도 되는지"를 코드로 확인합니다.$md$,
'{SEC-004}', 40),
('rls', 'RLS (Row Level Security)', '테이블의 행마다 누가 읽고 쓸 수 있는지 데이터베이스가 직접 검사하는 기능입니다.',
$md$## 무엇인가요
PostgreSQL 의 RLS 를 켜면, 쿼리마다 정책(policy)을 검사해서 조건에 맞는 행만 보여 주거나 바꾸게 합니다.
Supabase 는 브라우저에서 바로 DB 를 부를 수 있어서 RLS 가 사실상 유일한 문지기입니다.

## 왜 중요한가요
- RLS 가 꺼진 테이블은 anon 키만 있으면 누구나 전체를 읽고 쓸 수 있습니다.
- `using (true)` 정책은 RLS 를 켠 척만 하고 모두에게 열어 둔 것과 같습니다.

## 어떻게 쓰나요
```sql
alter table posts enable row level security;
create policy "본인 글만 수정" on posts
  for update using (user_id = auth.uid());
```
새 테이블을 만들면 바로 RLS 를 켜고, 읽기·쓰기 정책을 따로 만듭니다.$md$,
'{SEC-005,SEC-006}', 50),
('server-auth-check', '서버에서 로그인·권한 확인', 'Server Action 과 API 라우트는 누구나 직접 호출할 수 있으므로 맨 처음에 사용자를 확인해야 합니다.',
$md$## 무엇인가요
버튼을 숨겨도 Server Action 과 Route Handler 는 URL·요청만 알면 누구나 부를 수 있습니다.

## 왜 위험한가요
로그인 확인이 없으면 로그인하지 않은 사람이 데이터를 만들거나 지울 수 있습니다.

## 어떻게 막나요
- 함수 맨 앞에서 현재 사용자를 읽고, 없으면 바로 거절합니다.
- 사용자가 있더라도 "이 데이터의 주인인지"를 확인합니다([IDOR](/concepts/idor) 참고).$md$,
'{SEC-007}', 60),
('sql-injection', 'SQL 인젝션', '사용자 입력을 SQL 문자열에 이어 붙이면 입력으로 쿼리 자체를 바꿀 수 있습니다.',
$md$## 무엇인가요
`"select * from users where name = '" + name + "'"` 처럼 입력을 문자열로 이어 붙이면,
입력에 `' or '1'='1` 같은 값을 넣어 쿼리 의미를 바꿀 수 있습니다.

## 어떻게 막나요
- 쿼리 빌더(Supabase 클라이언트, Prisma)나 매개변수 바인딩(`$1`)을 씁니다.
- 직접 SQL 을 써야 하면 값은 반드시 매개변수로 넘깁니다.$md$,
'{SEC-008}', 70),
('idor', 'IDOR (남의 데이터 id 로 접근)', 'URL 이나 요청에 들어온 id 만 믿고 데이터를 돌려주면 다른 사람 것도 볼 수 있습니다.',
$md$## 무엇인가요
Insecure Direct Object Reference. `/api/orders/123` 에서 123 을 124 로 바꾸면 남의 주문이 보이는 문제입니다.

## 왜 생기나요
"로그인했는지"만 확인하고 "그 데이터의 주인인지"는 확인하지 않을 때 생깁니다.

## 어떻게 막나요
- 조회 조건에 현재 사용자를 같이 넣습니다: `where id = $1 and user_id = 현재 사용자`.
- Supabase 라면 RLS 정책으로 막고, secret 키로 읽을 때는 코드에서 소유자를 확인합니다.$md$,
'{SEC-009}', 80),
('xss', 'XSS (스크립트 삽입)', '사용자 입력을 HTML 로 그대로 넣으면 다른 사람 브라우저에서 스크립트가 실행됩니다.',
$md$## 무엇인가요
Cross-Site Scripting. 댓글에 `<script>` 나 `<img onerror=...>` 를 넣어 다른 방문자의 쿠키나 화면을 훔치는 공격입니다.

## React 에서는
React 는 기본적으로 글자를 이스케이프해서 안전합니다. `dangerouslySetInnerHTML` 을 쓰는 순간 그 보호가 사라집니다.

## 어떻게 막나요
- 가능하면 `dangerouslySetInnerHTML` 을 쓰지 않습니다.
- 꼭 HTML 을 넣어야 하면 DOMPurify 같은 라이브러리로 살균한 뒤 넣습니다.$md$,
'{SEC-010}', 90),
('cors', 'CORS', '다른 사이트에서 내 API 를 부를 수 있는지 브라우저가 확인하는 규칙입니다.',
$md$## 무엇인가요
브라우저는 다른 출처(도메인)의 API 를 부를 때 서버가 `Access-Control-Allow-Origin` 으로 허락했는지 봅니다.

## 왜 위험한가요
`*`(모두 허용)과 쿠키 인증을 같이 열어 두면, 악성 사이트가 로그인한 사용자의 권한으로 내 API 를 부를 수 있습니다.

## 어떻게 막나요
- 허용할 도메인을 명시적으로 적습니다.
- 쿠키를 쓰는 API 에 `*` 를 쓰지 않습니다.$md$,
'{SEC-011}', 100),
('webhook-signature', 'Webhook 서명 검증', 'Stripe·GitHub 가 보낸 요청이 맞는지 서명으로 확인해야 가짜 요청을 막을 수 있습니다.',
$md$## 무엇인가요
webhook 은 외부 서비스가 내 서버로 보내는 알림입니다. 주소만 알면 누구나 같은 형식으로 요청을 보낼 수 있습니다.

## 왜 위험한가요
서명을 확인하지 않으면 "결제 완료" 같은 가짜 이벤트로 유료 기능을 열 수 있습니다.

## 어떻게 막나요
- Stripe: `stripe.webhooks.constructEvent(body, signature, secret)`.
- GitHub: `X-Hub-Signature-256` 헤더를 webhook secret 으로 검증합니다.
- 검증 전에는 요청 본문을 믿지 않습니다.$md$,
'{SEC-012}', 110),
('llm-cost-limit', 'LLM 호출 사용량 제한', 'AI API 를 제한 없이 부르게 두면 한 사람이 요금 폭탄을 만들 수 있습니다.',
$md$## 무엇인가요
OpenAI·Anthropic API 는 쓴 만큼 돈이 나갑니다. 로그인·횟수 제한 없이 열린 AI 기능은 자동화된 요청에 그대로 노출됩니다.

## 어떻게 막나요
- 로그인한 사용자만 부르게 합니다.
- 사용자별·기간별 한도(횟수나 토큰)를 DB 에 두고 호출 전에 차감합니다.
- 입력 길이와 `max_tokens` 를 제한하고, 공급자 콘솔에서 월 지출 한도를 겁니다.$md$,
'{SEC-013}', 120),
('dependency-vulnerabilities', '의존성 취약점', '설치한 패키지의 오래된 버전에 알려진 보안 구멍이 있을 수 있습니다.',
$md$## 무엇인가요
npm 패키지에서 발견된 취약점은 CVE·GHSA 같은 번호로 공개됩니다. 잠금 파일(lockfile)에 고정된 버전이 그 범위에 있으면 영향을 받습니다.

## 어떻게 막나요
- 알림이 오면 고쳐진 버전으로 올립니다(`pnpm update 패키지`).
- 직접 쓰지 않는 하위 의존성이라면 상위 패키지를 올리거나 overrides 로 고정합니다.
- Dependabot 같은 자동 알림을 켭니다.$md$,
'{SEC-014}', 130),
('server-component', 'Server Component', 'Next.js App Router 의 기본 컴포넌트로, 서버에서만 실행되어 비밀값을 다룰 수 있습니다.',
$md$## 무엇인가요
App Router 의 컴포넌트는 기본이 Server Component 입니다. 서버에서 실행되고 결과 HTML 만 브라우저로 갑니다.

## 무엇이 좋은가요
- DB 조회, 비밀 키 사용을 컴포넌트 안에서 바로 할 수 있습니다.
- 브라우저로 보내는 JS 가 줄어듭니다.

## 주의할 점
`"use client"` 를 붙인 파일과 거기서 import 한 파일은 브라우저로 갑니다. 비밀값을 다루는 코드는 그쪽에 두지 않습니다.$md$,
'{SEC-004,SEC-007}', 140),
('server-action', 'Server Action', '폼이나 버튼에서 바로 부르는 서버 함수입니다. 공개 API 처럼 다뤄야 합니다.',
$md$## 무엇인가요
`"use server"` 를 붙인 함수는 클라이언트에서 호출할 수 있는 서버 함수가 됩니다.

## 주의할 점
- 내부적으로는 공개 HTTP 엔드포인트입니다. 화면에서 버튼을 숨겨도 직접 부를 수 있습니다.
- 그래서 맨 앞에서 로그인·권한을 확인하고, 입력은 Zod 같은 스키마로 검증합니다.$md$,
'{SEC-007,SEC-009}', 150)
on conflict (slug) do update set
  title = excluded.title,
  summary = excluded.summary,
  body_md = excluded.body_md,
  related_rule_ids = excluded.related_rule_ids,
  sort_order = excluded.sort_order;
