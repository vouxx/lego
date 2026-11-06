# 레고 (Lego) — 프로젝트 규칙

레고는 바이브 코딩 동반자 플랫폼입니다. 전체 설계는 `docs/design.md`를 따릅니다.
도구는 다섯 개: 스펙 변환기, 컨텍스트(규칙 파일) 생성기, 보안 점검기, PR 가드, 운영 점검. 설계 문서의 학습 도우미·세션 회고(4·5단계)는 2026-11-04 에 없앴다(개념 사전만 점검 설명용으로 남김).

## 기술 스택

Next.js 16 (App Router), React 19, TypeScript(strict), Supabase(PostgreSQL, Auth, Queues, Edge Functions), Tailwind CSS 4, shadcn/ui, TanStack Query, Zod, Vitest

## 명령어

pnpm 이 PATH 에 없으면 `npx pnpm@12.16.1 <명령>` 으로 실행한다.

- 개발: pnpm dev / 타입 체크: pnpm typecheck / 린트: pnpm lint / 테스트: pnpm test / 포맷: pnpm format
- E2E: pnpm e2e (로그인 흐름은 먼저 pnpm e2e:login 으로 세션 저장, 실제 스캔은 E2E_RUN_SCAN=1). PR 가드 로컬 E2E 는 `GITHUB_API_URL=http://localhost:4010 pnpm dev` 로 띄운 서버에서 돈다.
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

## 개념 사전

- 코드는 `features/concepts`. 화면은 공개 `/concepts`, `/concepts/[slug]`, 점검 결과의 '이게 뭐예요?' 는 `/concepts/rule/[ruleId]` 가 연결된 개념으로 보낸다.
- 공개 데이터라 secret 키로 읽고 `"use cache"` 로 캐시한다. anon 에 lego 스키마를 열지 않는다. 보안 규칙(22개)은 모두 개념 하나 이상에 연결돼 있어야 한다.

## PR 가드

- 코드는 `features/scans`(pr-guard·pr-reviews·pr-guard-prompts), 규칙은 `packages/scanner/src/diff`. 화면은 메뉴 `/guard`(최근 PR 리뷰 전체·프로젝트별 켜기/끄기), 프로젝트 화면의 'PR 가드' 칸, `/projects/[projectId]/reviews/[reviewId]`.
- GitHub App 으로 연결한 리포에서만 켤 수 있다(`projects.pr_guard_enabled`). pull_request webhook(opened·synchronize·reopened·ready_for_review, draft 제외) → `pr_reviews`(project, PR, head sha 로 중복 방지) → `after()` 로 처리.
- 보안 규칙은 바뀐 파일의 최신 내용 전체로 돌리고 **추가된 줄에 걸친 후보만** 남긴다. 리포 전체를 봐야 하는 SEC-002·SEC-016 은 PR 에서 돌리지 않는다.
- PR 규칙(PR-001 테스트 삭제·skip, PR-002 검사 끄기, PR-003 RLS 약화, PR-004 문서 없는 환경 변수, PR-005 이름을 흉내 낸 패키지·설치 스크립트)은 diff 로 확정되므로 AI 대신 고정 수정 프롬프트를 쓴다. 보안 후보만 AI 판별·설명.
- GitHub 게시: 상태 체크(남은 문제에 치명·높음이 있으면 failure) + 리뷰(COMMENT, 추가된 줄에만 줄 코멘트, 최대 20개). 권한이 없으면 결과는 레고에만 남기고 summary.note 에 이유를 쓴다.
- 커밋 사이 비교는 fingerprint(규칙+파일+코드 줄). 직전 리뷰에 있던 문제는 다시 코멘트하지 않고(`github_comment_id` 를 이어받음), 사라진 문제는 그 코멘트에 '해결됨' 답글 + GraphQL 로 대화를 접는다. 같은 문제의 AI 판별은 다시 하지 않는다.
- `/lego ignore 이유`: 레고 줄 코멘트에 답글(pull_request_review_comment 이벤트). GitHub API 로 쓰기 권한을 확인하고(자기 PR 은 admin 만), 코멘트가 그 설치·리포·PR 의 것인지 확인한 뒤 무시하고 체크를 다시 계산한다. 다음 커밋에도 이어진다.
- 엄격도(`projects.pr_guard_strictness`): strict=medium 이상 실패, normal=high 이상 실패(기본), relaxed=critical 만 실패·low 는 줄 코멘트 없음. 기준은 `schemas.ts STRICTNESS_RULES`. 리뷰 summary.strictness 에 남겨 무시 후 재계산도 같은 기준을 쓴다. GitHub 리뷰별 코멘트 API 는 line 을 비워 주므로 코멘트 id 는 PR 전체 코멘트 목록에서 pull_request_review_id 로 찾는다.
- 스펙 작업 ↔ PR(`spec_task_prs`): pull_request webhook 에서 PR 제목 `[T-n]`·브랜치 이름 `t-n` 으로 작업을 잇는다(PR 가드를 꺼도 동작). 머지되면 작업 완료(done_commit=머지 커밋). PR 가드 결론은 `setTaskPrCheck` 로 같은 PR 에 남긴다.
- 운영 점검 → 코드 위치: `schemaFromMigrations` 가 테이블·RLS·버킷을 만든 파일:줄을 돌려주고 `linkToCode` 가 LIVE-001/002/006 에 붙인다(수정 프롬프트에도 적음). 마지막 보안 점검 커밋 기준.
- 관리자 오탐 피드백(`/admin/feedback`): `ADMIN_USER_IDS`(auth user id, 쉼표) 계정만. user_metadata 는 사용자가 바꿀 수 있으니 쓰지 않는다. 집계는 `lego.rule_feedback()`(service_role 전용), 같은 (프로젝트, fingerprint) 는 한 건.
- 프로젝트 보안 추이: `services/trend.ts computeTrend`(순수 함수) — 끝난 점검 최근 30개, 오탐·무시 제외, 해결 시간 중앙값.
- 사용자용 Slack 알림(`features/notifications`, `slack_connections`): "Slack 에 추가" = OAuth v2 `incoming-webhook` 스코프만(봇 서버·토큰 저장 없음). `/api/slack/oauth/start` 가 state 쿠키(nonce.projectId)를 두고, callback 이 맞춰 본 뒤 webhook 을 저장한다. webhook_url 은 authenticated 에 열 권한이 없다(서버 전용). 보내는 곳: 운영 점검(새 문제), PR 가드(첫 리뷰 실패 또는 새 문제로 실패), 보안 점검(기본 꺼짐). 실패는 삼키고 last_error 에 남긴다. 로컬 E2E 는 `SLACK_API_URL` 모의 서버(운영에서는 무시, webhook 은 hooks.slack.com 만).
- 주간 요약(`notifications/services/weekly.ts`): 매주 월요일 00:00 UTC(09:00 KST) 뒤 첫 워커 호출에서 지난주(월~일) 요약을 보낸다. `kick_scan_worker` 가 대상이 있을 때도 워커를 부른다. `last_weekly_at` 을 먼저 차지하고 보내므로 겹쳐 돌아도 한 번만 가고, 실패해도 그 주는 다시 보내지 않는다. 아무 일도 없고 남은 문제도 없는 주는 보내지 않는다.
- 위험 영역(`scanner/diff/risk.ts`: 로그인·DB·결제·설정·CI·의존성·큰 변경)과 스펙 작업 범위(제목·커밋의 [T-n] → 작업 설명과 바뀐 파일을 Haiku 로 비교, 첫 리뷰에서만)를 리뷰 본문·체크·화면에 보여 준다.
- GitHub API 주소는 `GITHUB_API_URL` 로 바꿀 수 있다(production 이 아닐 때만). 로컬 E2E 는 모의 서버(localhost:4010)를 쓴다.

## 운영 점검

- 코드는 `features/live`, 판정은 `packages/scanner/src/live`(LIVE-001~007, AI 안 씀). 화면은 메뉴 `/live`(프로젝트별 대상·최근 결과)와 `/projects/[projectId]/live`.
- **소유 확인 전에는 점검하지 않는다.** 사이트의 `/.well-known/lego-verify.txt` 에 토큰이 있어야 한다. Supabase 주소·공개 키는 사용자에게 받지 않고 배포된 JS 에서 찾는다(공격자가 보는 그대로).
- 서버 요청은 `@/lib/net/safe-fetch` 만 쓴다: https 만, 공인 IP·443/8443 만, 연결할 때도 DNS 재검사, 리다이렉트마다 재검사, 8초·2MB, 점검 한 번에 요청 80개. 개발 환경에서만 localhost http 허용.
- 읽기 요청만 보낸다(테이블은 `limit=1` + `count=exact`, 버킷은 목록 5개). 응답 내용(행·파일·키 원문)은 저장하지 않고 판정만 `live_checks.results` 에 남긴다.
- 코드 비교(LIVE-006)는 가장 최근 스캔 커밋의 마이그레이션으로 한다. 직전 점검에 없던 항목은 '새로 생김'. 수동 점검은 2분 간격.
- 하루 한 번: pg_cron 의 `lego.kick_scan_worker()` 가 하루 지난 대상이 있으면 `/api/scan-worker` 를 부르고, 워커가 `runDueLiveChecks()` 로 3개씩 점검한다.

## 신뢰하지 않는 입력

- 리포 내용·파일 이름·PR 제목·LLM 출력은 공격자가 쓸 수 있다. 스캐너에 백트래킹이 큰 정규식을 넣지 않는다(`adversarial.test.ts` 가 200KB 입력으로 지킨다).
- GitHub 계정은 `lib/github/identity.ts` 로 `identities` 에서만 읽는다. `user_metadata` 는 사용자가 바꿀 수 있다.
- GitHub 설치는 사용자마다 따로 연결한다. 연결은 권한이 아니다. 리포를 다루는 동작은 `assertRepoWrite` 로 그때 쓰기 권한을 확인한다.
- GitHub 코멘트·규칙 파일에 넣는 값은 `shared/lib/untrusted-text.ts` 로 정리한다. 공개 PR 에 스펙 내용을 올리지 않는다.
- 외부 기여자의 PR(`trusted_author = false`)은 AI 판별과 스펙 범위 확인을 건너뛴다.
- 서버가 사용자 주소로 요청할 때는 `safeFetch` 만 쓰고, 소유를 확인한 사이트는 `stayOn: sameSite(url)` 를 붙인다.

## 팀 멤버

- 코드는 `features/members`. 소유자가 프로젝트 화면에서 GitHub 아이디로 초대 링크를 만들고, 그 계정이 `/invites/[token]` 에서 수락한다. 메일은 보내지 않는다(링크는 소유자가 전달). 7일, 한 번만, 프로젝트당 10명.
- 토큰은 해시(`project_invites.token_hash`)만 저장한다. 수락은 `lego.accept_project_invite`(service_role 전용)가 초대 삭제와 멤버 추가를 한 트랜잭션으로 한다. 토큰과 GitHub 계정(identities)이 모두 맞아야 수락된다.
- 멤버는 **보기 전용**이다. 읽기 정책은 scans·findings·pr_reviews·pr_review_findings·live_targets·live_checks 에만 더했다. 규칙 파일·스펙·Slack 연결은 소유자 전용.
- **`lego.projects` 의 읽기 정책은 넓히지 않는다.** 쓰기 전 소유 확인이 projects 를 RLS 로 읽는 방식(`findMyProject`, `getMyProject`)이라, 여기를 멤버에게 열면 멤버가 쓰기까지 하게 된다. 멤버 화면의 프로젝트 정보는 `getProjectAccess`(멤버십 확인 뒤 secret 키)로 읽는다.
- 위 결과 표를 읽어서 쓰기를 허용하면 안 된다(예: `getMyTarget` 만으로 대상 삭제). 쓰기는 `ownedTarget` 처럼 projects 로 소유자를 확인한다.

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

- `/api/health`: 30분 넘게 끝나지 않은 점검이 있으면 503. Sentry Uptime 이 이 주소를 본다. pg_cron 은 일이 있을 때만 워커를 부르므로 워커 자체에 cron 체크인을 달지 않는다.
- `/admin/usage`: 사용자 흐름과 최근 30일 AI 비용(관리자 전용). 외부 분석 도구는 쓰지 않는다(초대 토큰이 경로에 들어가므로).
- Sentry 는 NEXT_PUBLIC_SENTRY_DSN 이 있을 때만 켜진다. 서버에서 처리한 오류는 `@/lib/monitoring` 의 reportError 로 남긴다.
- 사용자 코드·쿠키·헤더·요청 본문은 보내지 않는다(`shared/lib/sentry.ts`). extra 에는 id 만 넣는다.

## 주의할 점 (보안 점검 결과에서 자동 추가)

- 아직 없음.
