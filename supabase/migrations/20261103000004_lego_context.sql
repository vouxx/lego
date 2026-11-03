-- 2단계 컨텍스트 생성기 (docs/design.md '2단계: 컨텍스트 생성기').
-- 규칙 팩(공용 마스터)과 프로젝트별 규칙 파일(CLAUDE.md / .cursorrules / AGENTS.md), 버전, 규칙 켜기/끄기.

-- rule_packs ----------------------------------------------------------------
-- detect: {"tags": [...]} 는 감지된 스택 태그 중 하나라도 있으면, {"always": true} 는 항상 적용.
create table lego.rule_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  detect jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  sort_order integer not null default 0
);

create table lego.rule_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references lego.rule_packs (id) on delete cascade,
  section text not null,
  content text not null,
  sort_order integer not null default 0,
  default_enabled boolean not null default true,
  unique (pack_id, content)
);
create index on lego.rule_pack_items (pack_id, sort_order);

-- context_files -------------------------------------------------------------
-- analysis: 생성 시점의 스택·명령어·폴더 요약·주의할 점. 규칙을 켜고 끌 때 LLM 없이 다시 조합하는 데 쓴다.
create table lego.context_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references lego.projects (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  target text not null check (target in ('claude_md', 'cursorrules', 'agents_md')),
  analysis jsonb,
  analyzed_commit text,
  current_version_id uuid,
  outdated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, target)
);
create index on lego.context_files (user_id);

create table lego.context_file_versions (
  id uuid primary key default gen_random_uuid(),
  context_file_id uuid not null references lego.context_files (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  content text not null,
  source text not null check (source in ('generated', 'edited')),
  based_on_commit text,
  pr_url text,
  created_at timestamptz not null default now()
);
create index on lego.context_file_versions (context_file_id, created_at desc);

alter table lego.context_files
  add constraint context_files_current_version_fk
  foreign key (current_version_id) references lego.context_file_versions (id) on delete set null;

-- 규칙 팩 항목의 켜기/끄기와 문구 수정. item_id 가 null 이면 사용자가 직접 추가한 규칙.
create table lego.context_file_rules (
  id uuid primary key default gen_random_uuid(),
  context_file_id uuid not null references lego.context_files (id) on delete cascade,
  user_id uuid not null references lego.profiles (id) on delete cascade,
  item_id uuid references lego.rule_pack_items (id) on delete cascade,
  section text,
  enabled boolean not null default true,
  override_content text,
  created_at timestamptz not null default now(),
  unique (context_file_id, item_id),
  check (item_id is not null or (section is not null and override_content is not null))
);
create index on lego.context_file_rules (context_file_id);

-- llm_calls 를 스캔이 아닌 규칙 파일 생성에도 쓴다.
alter table lego.llm_calls
  add column context_file_id uuid references lego.context_files (id) on delete set null;

-- 권한 ----------------------------------------------------------------------
grant select on lego.rule_packs, lego.rule_pack_items, lego.context_files,
  lego.context_file_versions, lego.context_file_rules to authenticated;
grant all on lego.rule_packs, lego.rule_pack_items, lego.context_files,
  lego.context_file_versions, lego.context_file_rules to service_role;

alter table lego.rule_packs enable row level security;
alter table lego.rule_pack_items enable row level security;
alter table lego.context_files enable row level security;
alter table lego.context_file_versions enable row level security;
alter table lego.context_file_rules enable row level security;

create policy "rule packs: read" on lego.rule_packs
  for select to authenticated using (auth.uid() is not null);

create policy "rule pack items: read" on lego.rule_pack_items
  for select to authenticated using (auth.uid() is not null);

create policy "own context files: read" on lego.context_files
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own context versions: read" on lego.context_file_versions
  for select to authenticated using (user_id = (select auth.uid()));

create policy "own context rules: read" on lego.context_file_rules
  for select to authenticated using (user_id = (select auth.uid()));

-- 초기 규칙 팩 -------------------------------------------------------------
insert into lego.rule_packs (slug, name, detect, sort_order) values
  ('common', '공통', '{"always": true}', 0),
  ('nextjs-app-router', 'Next.js App Router', '{"tags": ["nextjs-app-router"]}', 10),
  ('nextjs-pages-router', 'Next.js Pages Router', '{"tags": ["nextjs-pages-router"]}', 11),
  ('react', 'React 컴포넌트', '{"tags": ["react"]}', 20),
  ('supabase', 'Supabase', '{"tags": ["supabase"]}', 30),
  ('typescript', 'TypeScript', '{"tags": ["typescript"]}', 40),
  ('tailwind', 'Tailwind CSS', '{"tags": ["tailwind"]}', 50),
  ('testing', '테스트', '{"tags": ["vitest", "playwright", "jest"]}', 60)
on conflict (slug) do nothing;

insert into lego.rule_pack_items (pack_id, section, content, sort_order, default_enabled)
select p.id, i.section, i.content, i.sort_order, i.default_enabled
from (values
  ('common', '작업 방식', '기존 코드의 폴더 구조, 이름 규칙, 패턴을 먼저 읽고 그대로 따른다.', 1, true),
  ('common', '작업 방식', '한 번에 한 가지 변경만 하고, 관련 없는 파일은 고치지 않는다.', 2, true),
  ('common', '작업 방식', '새 라이브러리를 추가하기 전에 이미 있는 의존성으로 해결할 수 있는지 확인한다.', 3, true),
  ('common', '작업 방식', '비밀값(API 키, 토큰)은 코드에 쓰지 않고 환경 변수로만 읽는다.', 4, true),

  ('nextjs-app-router', '라우팅 (Next.js App Router)', 'app/ 에는 라우트 파일(page, layout, loading, error, route)만 둔다.', 1, true),
  ('nextjs-app-router', '라우팅 (Next.js App Router)', 'page.tsx 는 데이터를 조회해서 컴포넌트에 넘기는 역할만 한다. 50줄을 넘기지 않는다.', 2, true),
  ('nextjs-app-router', '라우팅 (Next.js App Router)', '기본은 Server Component. 상태·이벤트·브라우저 API가 필요한 가장 작은 컴포넌트에만 "use client" 를 붙인다.', 3, true),
  ('nextjs-app-router', '라우팅 (Next.js App Router)', '데이터 조회는 서버에서 한다. 클라이언트에서 직접 DB 나 비밀 키가 필요한 API 를 부르지 않는다.', 4, true),
  ('nextjs-app-router', '라우팅 (Next.js App Router)', '쓰기 작업은 Server Action, 외부에서 들어오는 요청(webhook, OAuth 콜백)만 Route Handler 로 만든다.', 5, true),
  ('nextjs-app-router', '라우팅 (Next.js App Router)', 'Server Action 과 Route Handler 는 맨 처음에 로그인 사용자와 권한을 확인한다.', 6, true),

  ('nextjs-pages-router', '라우팅 (Next.js Pages Router)', 'pages/ 에는 화면과 API 라우트만 두고, 로직은 별도 모듈로 뺀다.', 1, true),
  ('nextjs-pages-router', '라우팅 (Next.js Pages Router)', 'pages/api 의 핸들러는 맨 처음에 로그인 사용자와 권한을 확인한다.', 2, true),
  ('nextjs-pages-router', '라우팅 (Next.js Pages Router)', '비밀 키가 필요한 데이터는 getServerSideProps 나 API 라우트에서만 읽는다.', 3, true),

  ('react', '컴포넌트', '컴포넌트는 작은 단위로 만든다. 한 파일에 한 컴포넌트, 150줄을 넘으면 쪼갠다.', 1, true),
  ('react', '컴포넌트', '컴포넌트에는 비즈니스 로직을 넣지 않는다. 계산·검증·권한 판단은 별도 모듈에 둔다.', 2, true),
  ('react', '컴포넌트', '표시 컴포넌트는 props 만으로 동작한다. 로딩/빈 상태/에러 상태를 모두 처리한다.', 3, true),
  ('react', '컴포넌트', 'dangerouslySetInnerHTML 은 쓰지 않는다. 꼭 필요하면 살균(DOMPurify)한 값만 넣는다.', 4, true),

  ('supabase', '데이터 / Supabase', '스키마 변경은 반드시 supabase/migrations 새 파일로 한다. 기존 마이그레이션은 수정하지 않는다.', 1, true),
  ('supabase', '데이터 / Supabase', '새 테이블은 만든 직후 RLS 를 켜고 정책을 함께 작성한다. using (true) 금지.', 2, true),
  ('supabase', '데이터 / Supabase', 'service_role 키는 서버에서만 쓴다. NEXT_PUBLIC_ / VITE_ 접두사를 붙이지 않는다.', 3, true),
  ('supabase', '데이터 / Supabase', '다른 사용자의 데이터를 id 만으로 읽거나 고칠 수 없게, 조회 조건에 로그인 사용자를 넣거나 RLS 에 맡긴다.', 4, true),
  ('supabase', '데이터 / Supabase', 'DB 타입은 supabase gen types 로 생성한 것을 쓴다.', 5, true),

  ('typescript', 'TypeScript / 검증', 'strict 모드를 유지하고 any 를 쓰지 않는다.', 1, true),
  ('typescript', 'TypeScript / 검증', '외부 입력(폼, 요청, API 응답, LLM 응답)은 Zod 같은 스키마로 검증한 뒤 사용한다.', 2, true),
  ('typescript', 'TypeScript / 검증', '타입 오류를 as 나 @ts-ignore 로 덮지 않는다.', 3, true),

  ('tailwind', '스타일', 'Tailwind 유틸리티와 디자인 토큰만 쓴다. 임의 값(text-[#123456]) 금지.', 1, true),
  ('tailwind', '스타일', '클래스 조합은 cn() 같은 헬퍼를 쓴다.', 2, true),
  ('tailwind', '스타일', '기본 UI 는 프로젝트에 있는 컴포넌트(shadcn/ui 등)를 쓰고 새로 만들지 않는다.', 3, true),

  ('testing', '테스트', '로직(계산·검증·권한)에는 단위 테스트를 함께 작성한다.', 1, true),
  ('testing', '테스트', '로그인 → 핵심 기능 → 결과 확인 같은 주요 흐름은 E2E 테스트로 검증한다.', 2, true),
  ('testing', '테스트', '작업을 끝내기 전에 테스트와 타입 체크를 실행한다.', 3, true)
) as i(slug, section, content, sort_order, default_enabled)
join lego.rule_packs p on p.slug = i.slug
on conflict (pack_id, content) do nothing;
