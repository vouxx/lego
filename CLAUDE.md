# 레고 (Lego) — 프로젝트 규칙

레고는 바이브 코딩 동반자 플랫폼입니다. 전체 설계는 `docs/design.md`를 따릅니다.
설계 문서의 5단계(보안 점검기, 컨텍스트 생성기, 스펙 변환기, 학습 도우미, 세션 회고·공유)를 모두 구현했다. 남은 일은 운영 검증과 측정(docs/deploy.md).

## 기술 스택

Next.js 16 (App Router), React 19, TypeScript(strict), Supabase(PostgreSQL, Auth, Queues, Edge Functions), Tailwind CSS 4, shadcn/ui, TanStack Query, Zod, Vitest

## 명령어

pnpm 이 PATH 에 없으면 `npx pnpm@12.16.1 <명령>` 으로 실행한다.

- 개발: pnpm dev / 타입 체크: pnpm typecheck / 린트: pnpm lint / 테스트: pnpm test / 포맷: pnpm format
- E2E: pnpm e2e (로그인 흐름은 먼저 pnpm e2e:login 으로 세션 저장, 실제 스캔은 E2E_RUN_SCAN=1)
- 로컬 E2E(GitHub 로그인 없이): pnpm e2e:local-seed 후 pnpm e2e --project=local-signed-in (로컬 Supabase 전용 테스트 사용자)
- 탐지율 측정: pnpm --filter @lego/scanner bench [--osv] → packages/scanner/benchmark/RESULTS.md
- 로컬 DB: npx supabase start (Docker 필요, docs/local-dev.md) / 초기화: npx supabase db reset
- 운영 DB 마이그레이션 적용: pnpm db:migrate
- DB 타입 생성: pnpm db:types

## Supabase 프로젝트 공유 (중요)

- 로컬 개발은 로컬 Supabase(Docker)를 쓴다. 공유 프로젝트 `kqspyogrfebnlitqchvd` 는 **운영 전용**이며 다른 앱(zeek, wbs, resume)과 같이 쓴다. 레고의 모든 객체는 `lego` 스키마에만 만든다.
- `supabase db push`, `supabase migration repair`, `supabase config push`, `supabase db reset --linked` 는 절대 쓰지 않는다. 다른 앱의 마이그레이션 이력과 설정을 망가뜨린다.
- 새 마이그레이션은 먼저 로컬(`npx supabase db reset`)에서 확인하고, 운영에는 `pnpm db:migrate`(scripts/db-migrate.sh)로 적용한다. 이력은 `lego.schema_migrations` 에 남는다.
- `auth.users` 는 다른 앱과 공유한다. auth 스키마에 트리거를 걸지 않고, profiles 는 로그인 콜백에서 upsert 한다.
- Supabase 클라이언트는 `db: { schema: DB_SCHEMA }` 로 만든다(src/lib/supabase/env.ts).

## 라우팅 (Next.js App Router)

- app/ 에는 라우트 파일(page, layout, loading, error, route)만 둔다.
- page.tsx 는 데이터를 조회해서 features 의 컴포넌트에 넘기는 역할만 한다. 50줄을 넘기지 않는다.
- 기본은 Server Component. 상태·이벤트·브라우저 API가 필요한 가장 작은 컴포넌트에만 "use client" 를 붙인다.
- 라우트 그룹으로 레이아웃을 나눈다: (marketing), (auth), (dashboard).
- 쓰기 작업은 Server Action, 외부에서 들어오는 요청(webhook, OAuth 콜백)만 Route Handler 로 만든다.

## 컴포넌트

- 컴포넌트는 아주 작은 단위로 만든다. 한 파일에 한 컴포넌트, 150줄을 넘으면 쪼갠다.
- 컴포넌트에는 비즈니스 로직을 넣지 않는다. 계산·검증·권한 판단은 features/*/services 에 둔다.
- 컴포넌트에서 Supabase 를 직접 호출하지 않는다. 조회는 page 나 hooks, 쓰기는 actions 를 거친다.
- 표시 컴포넌트는 props 만으로 동작한다. 로딩/빈 상태/에러 상태를 모두 처리한다.
- 기본 UI 는 shared/ui(shadcn/ui) 를 쓰고 새로 만들지 않는다. 추가: `npx shadcn@latest add <이름>` (pnpm 이 PATH 에 있어야 함). 생성된 파일의 `cn` import 는 `@/shared/lib/cn` 이어야 한다.
- 쿠키·세션·searchParams 를 읽는 컴포넌트는 `<Suspense>` 안에 둔다(cacheComponents 가 켜져 있어 밖에서 읽으면 빌드 에러).

## 폴더와 의존 방향

- features/<기능>/{components, hooks, actions.ts, services, repository.ts, schemas.ts}
- 의존 방향: app → components → hooks/actions → services → repository. 반대 방향 import 금지 (ESLint `import/no-restricted-paths` 가 막는다).
- 다른 feature 의 내부 파일을 import 하지 않는다. 필요하면 shared 로 옮긴다.
- 스캔 엔진은 packages/scanner (`@lego/scanner`) 에 둔다. 프레임워크(Next.js, Supabase)에 의존하지 않는 순수 TypeScript 로 작성한다.
- src/lib 은 인프라(supabase 클라이언트, GitHub App, env, 현재 사용자)만 둔다. features/app 을 import 하지 않는다.
- 현재 사용자는 `@/lib/auth` 의 getCurrentUser / requireUser 로만 읽는다.

## 스캔 파이프라인

- startScanAction → 한도 차감(`lego.consume_scan_quota`) → scans insert → pgmq `lego_scan_jobs` 적재 → `after()` 로 같은 서버에서 워커 실행.
- 워커는 Edge Function 이 아니라 Next.js(Node) 에서 돈다(`features/scans/services/worker.ts`). 공유 Supabase 프로젝트에 비밀값을 올리지 않기 위해서다. 배포 후에는 pg_cron 이 `POST /api/scan-worker`(Bearer SCAN_WORKER_SECRET) 를 부른다.
- 정적 탐지는 `@lego/scanner`, LLM 호출은 `@/lib/llm` 게이트웨이만 쓴다. 1차 판별 Haiku, 설명·수정 프롬프트 Sonnet. 코드는 `maskSecrets` 로 가린 뒤에만 저장하거나 LLM 에 보낸다.
- ANTHROPIC_API_KEY 가 없으면 정적 탐지 결과만 저장한다(summary.llm = "skipped").
- SEC-014 는 `auditDependencies`(OSV 조회)로 따로 돈다. 실패해도 스캔은 계속하고 summary.dependencyNote 에 남긴다.
- 값·파일만으로 확정되는 규칙(SEC-001~004)은 LLM 이 오탐이라 해도 테스트 경로가 아니면 숨기지 않는다(`verdict-guard.ts`). 코드 주석으로 AI 판별을 속이는 공격 때문이다.
- 스캔 비교는 `lego.scan_diff` (fingerprint 기준). 직전 스캔에서 무시한 항목은 새 스캔에서도 무시 상태로 이어진다.
- SEC-017~021 은 `detectors/taint.ts`(요청 값에서 만든 변수 추적, 주소 앞부분을 입력이 정하는지)를 같이 쓴다. 정확한 데이터 흐름 분석이 아니라 후보 고르기이고, 다른 파일의 헬퍼로 넘어간 값은 놓친다.
- 규칙을 추가하면 `packages/scanner/src/rules/*.test.ts` 에 취약/안전 예시를 같이 넣고, `benchmark/samples` 에도 사례를 넣어 탐지율을 다시 잰다. `lego.rules` 시드와 개념 사전 연결도 새 마이그레이션으로 넣는다(예: 20261103000008). 테스트의 가짜 키는 문자열을 이어 붙여 만든다(GitHub push protection).

## 컨텍스트 생성기 (2단계)

- 코드는 `features/context`. 화면은 `/projects/[projectId]/context?target=claude_md|cursorrules|agents_md`.
- 생성: 리포 읽기(`readRepoAtCommit`) → 스택 감지(`shared/stack`) → 명령어(package.json scripts) → 폴더 요약(Haiku 1회) → 규칙 팩 조합 → 버전 저장.
  같은 커밋이면 분석을 캐시(`context_files.analysis`)하고 '주의할 점'(열린 findings)만 새로 반영한다.
- 문서 조합은 LLM 없이 `services/render.ts` 가 한다(설계의 Sonnet 조합 대신). 규칙을 켜고 끌 때마다 즉시·무료로 다시 만들기 위해서다.
- 규칙 팩은 DB(`rule_packs`, `rule_pack_items`)에 있다. 새 팩·항목은 마이그레이션으로 추가한다. 사용자 설정은 `context_file_rules`(item_id null = 직접 추가).
- PR 은 App 설치에 contents·pull_requests 쓰기 권한이 있을 때만. 주소로 등록한 공개 리포는 내려받기만.
- push webhook 에서 package.json·lockfile 이 바뀌거나 새 최상위 항목이 생기면 `outdated = true`. 화면은 분석 커밋과 최신 커밋도 비교한다.
- 스택 감지는 `src/shared/stack` 에 있고 projects 와 context 가 같이 쓴다.

## 스펙 변환기 (3단계)

- 코드는 `features/specs`. 화면은 `/specs`, `/specs/new`, `/specs/[specId]`. 프로젝트 연결은 선택(`specs.project_id` nullable, projects 는 그대로).
- 흐름: 아이디어 → 확인 질문(Haiku) → `POST /api/specs/[specId]/generate` 가 PRD → 설계 → 작업 목록 → 작업별 프롬프트(Sonnet, 5개씩 병렬)를 NDJSON 으로 흘려보낸다.
  생성은 응답 스트림과 분리해 `after()` 로 끝까지 돌고, 단계마다 결과를 저장한다. 10분 넘게 멈추면 다시 만들 수 있다.
- 작업 그래프는 `services/task-graph.ts` 가 검사(중복·없는 선행 작업·순환)하고 키를 T-1… 로 다시 매긴다. 잘못되면 오류를 알려 주고 한 번 다시 요청한다.
- push webhook 의 커밋 메시지 `[T-3]` 으로 연결된 스펙의 작업을 완료 처리한다. 2단계 생성기는 프로젝트의 최근 완성 스펙 개요를 '프로젝트 개요'로 넣는다.
- `prompt_templates`: 작업 프롬프트를 '템플릿으로 저장'하면 다음 스펙의 프롬프트 예시로 쓰인다(스택 태그가 겹치는 것 2개).
- 규칙 파일 조합(`shared/context`)은 context 와 specs 가 같이 쓴다.

## 학습 도우미 (4단계)

- 코드는 `features/learn`. 화면은 `/learn`, `/learn/[explanationId]`, `/learn/finding/[findingId]`(발견 항목의 '이게 뭐예요?'), 공개 `/concepts`, `/concepts/[slug]`.
- 설명은 Sonnet 한 번(구조화 출력: 요약·단계·Mermaid·개념·퀴즈 3문항). 코드는 `maskSecrets` 후 sha256 으로 캐시한다(같은 사용자는 기존 것, 다른 사용자는 내용 복사).
- 퀴즈 정답·해설은 화면에 보내지 않고 채점할 때만 돌려준다. 숙련도는 처음엔 점수, 이후 이전 60% + 이번 40%.
- Mermaid 는 클라이언트에서 strict 모드로 그린다. 실패하면 Haiku 로 한 번 다시 만들고, 또 실패하면 숨긴다.
- 개념 사전(`concepts`)은 공개 데이터라 secret 키로 읽고 `"use cache"` 로 캐시한다. anon 에 lego 스키마를 열지 않는다. 보안 규칙(22개)은 모두 개념 하나 이상에 연결돼 있어야 한다.
- 설계와 다른 점: 설명은 스트리밍 Route Handler 대신 Server Action 하나로 만든다(구조화 출력, 약 15초).

## 세션 회고·공유 (5단계)

- 코드는 `features/sessions`. 화면은 `/sessions`, `/sessions/new`, `/sessions/[sessionId]`, 공개 `/gallery`, `/s/[slug]`(+ `opengraph-image`).
- **원본 로그는 서버로 보내지 않는다.** 브라우저에서 형식별 파서(`services/parse`: Claude Code JSONL, Cursor 마크다운, 텍스트)로 공통 메시지로 바꾸고,
  `services/mask.ts`(SEC-001 패턴, 개인 키, URL 비밀번호, KEY=value, 이메일, 홈 경로)로 가린 뒤 미리보기 확인 → 서명 URL 로 비공개 버킷 `lego-sessions` 에 JSON 만 올린다.
  서버는 finalize 에서 같은 함수로 2차 검사하고, 바뀐 게 있으면 덮어쓴다. 마스킹 테스트 세트(`mask.test.ts`)는 누출 0건이어야 한다.
- `services/parse`, `mask.ts`, `stats.ts`, `condense.ts` 는 브라우저에서도 돌므로 `server-only`·Node API 를 쓰지 않는다. `@lego/scanner/secrets` 만 import 한다.
- 분석은 finalize 뒤 `after()` 로 Sonnet 한 번(긴 세션은 `condenseTranscript` 로 6만 자 이내). 큐 대신 실패·10분 정체 시 '다시 분석'.
- 공개·링크 공유 세션과 갤러리는 서버가 visibility 를 확인한 뒤 secret 키로 읽는다(anon 에 lego 스키마를 열지 않음). 신고 3건이면 자동으로 숨긴다.
- `sessions → profiles` 조인은 `profiles!sessions_user_id_fkey` 로 쓴다(session_likes 때문에 관계가 둘).

## 인증 / 권한

- 로그인은 Supabase GitHub OAuth, 리포 읽기는 GitHub App 설치 토큰. 설정은 docs/setup-github.md.
- secret 키 클라이언트(`@/lib/supabase/admin`)는 RLS 를 우회한다. services 에서 권한을 확인한 뒤 repository 에서만 쓴다.
- URL 로 들어온 id(installation_id, projectId 등)는 그대로 믿지 않고 소유자를 확인한다.
- 로그인 후 이동 경로는 `safeNextPath` 로 검증한다.

## 데이터 / Supabase

- 스키마 변경은 반드시 supabase/migrations 새 파일로 한다. 기존 마이그레이션은 수정하지 않는다.
- 새 테이블은 만든 직후 RLS 를 켜고 정책을 함께 작성한다. using (true) 금지.
- service_role 키는 서버(Edge Function, Server Action)에서만 쓴다. NEXT_PUBLIC_ 접두사를 붙이지 않는다.
- 쿼리는 repository.ts 에만 쓴다. 생성된 DB 타입을 사용한다.
- findings.snippet 등 사용자 코드 조각은 저장 전에 비밀값을 마스킹한다.

## TypeScript / 검증

- any 금지. 외부 입력(폼, 요청, LLM 응답)은 Zod 로 검증한 뒤 사용한다.
- Server Action 은 shared/lib/result.ts 의 Result 타입({ ok: true, data } | { ok: false, error })을 반환하고 throw 하지 않는다.

## 스타일

- Tailwind 유틸리티와 디자인 토큰만 쓴다. 임의 값(text-[#123456]) 금지.
- 클래스 조합은 cn() 을 쓴다.

## 테스트

- services 와 scanner 규칙은 Vitest 단위 테스트를 함께 작성한다. 규칙마다 취약한 예시 / 안전한 예시 픽스처를 둔다.
- 로그인 → 프로젝트 생성 → 스캔 → 결과 확인 흐름은 Playwright 로 검증한다(tests/e2e).
- `packages/scanner/benchmark/samples` 는 일부러 취약하게 만든 코드다. 타입체크·린트·포맷에서 제외되어 있고, 비밀값은 `{{ANTHROPIC_KEY}}` 같은 자리표시자로만 쓴다.

## 모니터링

- Sentry 는 NEXT_PUBLIC_SENTRY_DSN 이 있을 때만 켜진다. 서버에서 처리한 오류는 `@/lib/monitoring` 의 reportError 로 남긴다.
- 사용자 코드·쿠키·헤더·요청 본문은 보내지 않는다(`shared/lib/sentry.ts`). extra 에는 id 만 넣는다.

## 주의할 점 (보안 점검 결과에서 자동 추가)

- 아직 없음.
