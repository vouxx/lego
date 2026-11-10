# 바이브 코딩 동반자 플랫폼 — 전체 설계

Nov 2, 2026 · @치치

## 개요

1단계의 목표는 **GitHub 리포를 연결하면 AI로 만든 앱에서 자주 생기는 보안 실수를 찾고, 바로 붙여넣을 수 있는 수정 프롬프트를 주는 것**입니다. 이때 만드는 리포 분석, 작업 큐, LLM 게이트웨이는 2단계 이후 컨텍스트 생성기, 스펙 변환기, 학습 도우미가 그대로 재사용합니다.

**1단계에 포함**

- GitHub 로그인(Supabase Auth)과 GitHub App 설치로 리포 연결
- 리포 스캔: 정적 규칙 탐지 + LLM 판단(오탐 걸러내기, 설명, 수정 프롬프트 생성)
- 스캔 결과 화면: 심각도별 목록, 코드 위치, 수정 프롬프트 복사, 무시/해결 처리
- 스캔 이력 비교: 지난 스캔 대비 새로 생긴 문제와 해결된 문제
- LLM 사용량 기록과 사용자별 월 한도

**2단계 이후로 미룸**

- PR이 올라올 때 자동 점검(GitHub Check Run)
- 배포된 URL을 직접 검사하는 라이브 점검(도메인 소유 확인이 필요해서 별도 단계로 분리)
- 팀/조직 단위 프로젝트 공유
- 결제

## 전체 로드맵

다섯 기능을 5단계, 총 10주에 나눠 만듭니다. 개발 순서는 공통 기반을 가장 많이 만드는 보안 점검기부터이고, 사용자 흐름은 기획 → 준비 → 개발 → 점검 → 회고 순서입니다.

&#91;embedded content: 기능 연결 흐름 · 5개 기능, 데이터 전달 3개, 공통 기반 4개\]

기능끼리는 데이터로 이어집니다. 보안 발견 항목은 CLAUDE.md의 주의할 점과 학습 도우미의 개념 설명으로, 회고에서 찾은 잘된 프롬프트는 스펙 변환기의 작업 프롬프트 템플릿으로 들어갑니다.

| 단계 | 기능 | 기간 | 재사용하는 것 | 새로 만드는 것 |
| --- | --- | --- | --- | --- |
| 1단계 | 보안 점검기 | 3주 | — | 공통 기반 전체, 보안 규칙 14개 |
| 2단계 | 컨텍스트 생성기 | 2주 | 리포 분석, LLM 게이트웨이, findings | 규칙 팩, 문서 버전 관리, PR 생성(GitHub App 쓰기 권한 추가) |
| 3단계 | 스펙 변환기 | 2주 | LLM 게이트웨이, 컨텍스트 생성기, push webhook | 스트리밍 생성, 작업 보드, prompt\_templates |
| 4단계 | 학습 도우미 | 1주 | 리포 파일 읽기, findings, LLM 캐시 | 개념 사전, 퀴즈, 숙련도 |
| 5단계 | 세션 회고·공유 | 2주 | 작업 큐·워커, 비밀값 패턴(SEC-001), prompt\_templates | 로그 파서, 공개 갤러리, 공개용 RLS |

단계 번호는 처음 아이디어 번호와 다릅니다. 학습 도우미가 4단계, 세션 회고가 5단계입니다. 아래 ‘기술 스택’부터 ‘개발 일정’까지는 전 단계 공통 기반을 포함한 1단계 상세이고, 2\~5단계는 문서 끝에 있습니다.

## 기술 스택

Next.js + Supabase(PostgreSQL) 하나로 프론트, API, DB, 인증, 큐, 백그라운드 작업까지 처리합니다. 별도 서버나 Redis 없이 운영할 수 있는 것이 핵심입니다.

| 영역 | 기술 | 이 프로젝트에서 하는 일 |
| --- | --- | --- |
| 프레임워크 | Next.js (App Router), React, TypeScript | 화면, Server Actions, Route Handlers(GitHub webhook) |
| UI | Tailwind CSS, shadcn/ui, lucide-react | 디자인 시스템과 기본 컴포넌트 |
| 코드 표시 | Shiki | 발견된 코드 조각 하이라이트 |
| 서버 상태 | TanStack Query | 스캔 진행 상태 조회, 캐시 |
| 폼/검증 | React Hook Form, Zod | 입력 검증, LLM 구조화 출력 검증 |
| DB | PostgreSQL (Supabase) | 프로젝트, 스캔, 발견 항목, 사용량 |
| 인증 | Supabase Auth (GitHub OAuth) | 로그인, RLS의 auth.uid() |
| 권한 | Row Level Security | 사용자는 자기 데이터만 조회 |
| 작업 큐 | Supabase Queues (pgmq) | 스캔 작업 적재, 재시도 |
| 백그라운드 작업 | Supabase Edge Functions (Deno) | 스캔 워커, LLM 판단 |
| 스케줄러 | pg\_cron | 큐 소비 트리거, 오래된 작업 정리 |
| 실시간 | Supabase Realtime | 스캔 진행률 화면에 푸시 |
| 파일 | Supabase Storage | 스캔 리포트 내보내기(JSON/PDF) |
| GitHub 연동 | GitHub App, Octokit | 리포 파일 읽기, 설치 토큰, webhook |
| 코드 분석 | @babel/parser 또는 ts-morph, 정규식, SQL 파서(pgsql-ast-parser) | 정적 규칙 탐지 |
| AI | Claude API (Anthropic SDK) | 오탐 판별, 설명, 수정 프롬프트 생성 |
| 테스트 | Vitest, Playwright | 규칙 단위 테스트, E2E |
| 품질 | ESLint, Prettier, Husky, lint-staged | 컨벤션 강제 |
| 배포 | Vercel(Next.js), Supabase Cloud | 프리뷰 배포, DB 마이그레이션 |
| CI | GitHub Actions | 타입 체크, 테스트, `supabase db push` |
| 모니터링 | Sentry, Vercel Analytics | 에러 추적, 사용 지표 |

LLM은 비용 때문에 두 단계로 나눕니다. 대량 1차 판별은 가벼운 모델(Haiku), 확정된 항목의 설명과 수정 프롬프트는 상위 모델(Sonnet)로 처리합니다. Edge Function의 실행 시간 제한에 걸리면 워커만 Node 서버(Fly.io)로 옮길 수 있게 워커 로직을 프레임워크에 의존하지 않는 모듈로 둡니다.

## 시스템 아키텍처

Next.js는 스캔을 등록만 하고 즉시 응답합니다. 실제 스캔은 큐를 거쳐 Edge Function 워커가 처리하고, 진행 상황은 Realtime으로 화면에 전달됩니다.

&#91;embedded content: 시스템 구성도 · Vercel + Supabase + 외부 API 2개\]

스캔 흐름: `startScan` → 한도 차감 → `scans` insert + pgmq 적재 → pg\_cron이 매분 워커 호출 → 워커가 GitHub에서 해당 커밋의 파일을 읽고 정적 규칙 실행 → 후보를 Claude로 판별 → `findings` 저장, `scans.progress` 갱신 → Realtime으로 화면 갱신. 실패하면 메시지가 큐에 남아 최대 3회 재시도하고, 그 뒤에는 `status = failed`와 에러를 기록합니다.

## 데이터 모델

테이블은 8개입니다. 모든 사용자 데이터는 `user_id`를 갖고, RLS로 `auth.uid()`와 같은 행만 읽을 수 있습니다. 쓰기는 대부분 서비스 역할(워커)만 합니다.

| 테이블 | 주요 컨럼 | 관계 |
| --- | --- | --- |
| `profiles` | id(=auth.users.id), github\_login, avatar\_url, plan, created\_at | users 1:1 |
| `github_installations` | id, user\_id, installation\_id, account\_login, created\_at | profiles 1:N |
| `projects` | id, user\_id, installation\_id, repo\_full\_name, default\_branch, detected\_stack(jsonb), created\_at | profiles 1:N |
| `scans` | id, project\_id, user\_id, commit\_sha, status(queued/running/done/failed), progress(0\~100), summary(jsonb), started\_at, finished\_at, error | projects 1:N |
| `findings` | id, scan\_id, user\_id, rule\_id, severity, file\_path, line\_start, line\_end, snippet, fingerprint, ai\_verdict(true\_positive/false\_positive/uncertain), explanation, fix\_prompt, status(open/ignored/resolved) | scans 1:N, rules N:1 |
| `rules` | id(예: SEC-001), title, category, severity, detector(regex/ast/sql/llm), enabled | 공용 마스터 |
| `llm_calls` | id, user\_id, scan\_id, purpose, model, input\_tokens, output\_tokens, cost\_usd, latency\_ms, cached, created\_at | 사용량/비용 로그 |
| `usage_quotas` | user\_id, period(YYYY-MM), scans\_used, tokens\_used, scans\_limit, tokens\_limit | profiles 1:N |

**설계 포인트**

- `findings.fingerprint` = hash(rule\_id + file\_path + 정규화한 코드). 스캔 간 같은 문제를 식별해서 ‘새로 생긴 문제 / 해결된 문제’를 계산하고, 사용자가 무시한 항목을 다음 스캔에서도 무시합니다.
- `findings`에 `user_id`를 중복 저장해서 RLS 정책을 조인 없이 단순하게 유지합니다.
- `snippet`에 비밀값이 그대로 저장되지 않도록, 저장 전에 마스킹합니다(`sk-ant-****abcd`).
- `scans`는 Realtime 대상으로 등록해서 `progress` 변경을 화면에 푸시합니다.

**RLS 정책 예시**

```sql
alter table public.findings enable row level security;

create policy "own findings: read" on public.findings
  for select using (user_id = (select auth.uid()));

-- 사용자는 status(open/ignored/resolved)만 바꿀 수 있음
create policy "own findings: update status" on public.findings
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.findings from authenticated;
grant update (status) on public.findings to authenticated;

-- insert/delete는 정책 없음 = service_role(워커)만 가능
```

## API 목록

화면에서 호출하는 쓰기 작업은 Server Actions, 외부에서 들어오는 요청은 Route Handlers, 오래 걸리는 작업은 Edge Functions가 맡습니다. 읽기는 Server Component에서 Supabase를 직접 조회합니다(RLS가 권한을 지킴).

| 종류 | 이름 | 입력 → 출력 | 설명 |
| --- | --- | --- | --- |
| Route Handler | `GET /auth/callback` | code → redirect | Supabase GitHub OAuth 콜백 |
| Route Handler | `GET /api/github/install/callback` | installation\_id → redirect | GitHub App 설치 후 `github_installations` 저장 |
| Route Handler | `POST /api/github/webhook` | GitHub 이벤트 → 200 | 서명 검증(X-Hub-Signature-256), 설치 삭제/리포 제거 반영 |
| Server Action | `listInstallableRepos()` | → Repo\[\] | 설치 토큰으로 접근 가능한 리포 목록 |
| Server Action | `createProject(repoFullName)` | → Project | 프로젝트 생성 + 기술 스택 감지 |
| Server Action | `startScan(projectId)` | → { scanId } | 한도 확인 → `scans` insert → pgmq에 작업 적재 |
| Server Action | `updateFindingStatus(id, status)` | → Finding | open / ignored / resolved |
| Server Action | `regenerateFixPrompt(findingId)` | → { fixPrompt } | 대상 도구(Claude Code, Cursor)를 바꿔 다시 생성 |
| Server Action | `exportScanReport(scanId)` | → { url } | Storage에 JSON 저장 후 서명 URL |
| Edge Function | `scan-worker` | (pg\_cron 매분 호출) | 큐에서 작업을 꺼내 스캔 실행, 실패 시 최대 3회 재시도 |
| Edge Function | `_shared/llm.ts` | prompt → 구조화 결과 | LLM 게이트웨이: 모델 선택, 캐시, Zod 검증, `llm_calls` 기록 |
| DB 함수 | `scan_diff(scan_id)` | → new/fixed/unchanged | fingerprint 기준으로 직전 스캔과 비교 |
| DB 함수 | `consume_quota(user_id, kind)` | → boolean | 한도 차감(트랜잭션으로 동시성 보장) |

모든 Server Action은 `{ ok: true, data } | { ok: false, error: { code, message } }` 형태로 반환하고, 입력은 Zod 스키마로 검증합니다.

## 폴더 구조

`app/`은 라우트만, 비즈니스 로직은 `features/*/services`, 화면 조각은 `features/*/components`에 둡니다. 스캔 엔진은 `packages/scanner`로 분리해서 Edge Function과 테스트가 같은 코드를 씁니다.

```
.
├── src/
│   ├── app/                          # 라우팅 전용 (page, layout, loading, error)
│   │   ├── (marketing)/page.tsx      # 랜딩
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── projects/page.tsx
│   │   │   ├── projects/new/page.tsx
│   │   │   ├── projects/[projectId]/page.tsx
│   │   │   └── projects/[projectId]/scans/[scanId]/page.tsx
│   │   ├── auth/callback/route.ts
│   │   └── api/github/{webhook,install/callback}/route.ts
│   ├── features/
│   │   ├── projects/
│   │   │   ├── components/           # ProjectCard, RepoPicker ... (표시만)
│   │   │   ├── hooks/                # useProjects (TanStack Query)
│   │   │   ├── actions.ts            # Server Actions (입력 검증 + service 호출)
│   │   │   ├── services/             # 비즈니스 로직 (순수 함수 + repository 호출)
│   │   │   ├── repository.ts         # Supabase 쿼리
│   │   │   └── schemas.ts            # Zod 스키마 + 타입
│   │   ├── scans/                    # 같은 구조
│   │   └── findings/                 # 같은 구조
│   ├── shared/
│   │   ├── ui/                       # shadcn/ui 기본 컴포넌트
│   │   └── lib/                      # cn, format, result 타입
│   └── lib/supabase/{server,client,middleware}.ts
├── packages/
│   └── scanner/                      # 프레임워크 무관한 스캔 엔진
│       ├── rules/                    # SEC-001.ts ... 규칙당 파일 1개 + 테스트
│       ├── detectors/                # regex, ast, sql
│       └── index.ts
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── scan-worker/index.ts
│   │   └── _shared/{llm,github,mask}.ts
│   └── seed.sql                      # rules 마스터 데이터
├── tests/e2e/                        # Playwright
└── CLAUDE.md                         # 이 프로젝트 자체의 컨텍스트 파일
```

의존 방향은 한 방향입니다: `app → features/components → hooks/actions → services → repository`. 거꾸로 참조하면 ESLint(`import/no-restricted-paths`)가 막습니다.

## 보안 점검 규칙

1단계 규칙은 14개입니다. 정적 탐지가 후보를 넓게 찾고, LLM이 주변 코드를 보고 오탐을 걸러낸 뒤 설명과 수정 프롬프트를 만듭니다.

| ID | 규칙 | 탐지 방식 | 심각도 |
| --- | --- | --- | --- |
| SEC-001 | 코드에 하드코딩된 API 키/토큰 (Anthropic, OpenAI, Stripe, AWS, GitHub 등) | regex + 엔트로피 | Critical |
| SEC-002 | `.env` 파일이 커밋됨 / `.gitignore`에 누락 | 파일 트리 | Critical |
| SEC-003 | `NEXT_PUBLIC_` / `VITE_` 접두사가 붙은 비밀 키(클라이언트 번들에 노출) | regex | Critical |
| SEC-004 | Supabase `service_role` 키를 클라이언트 코드에서 사용 | AST("use client" 파일 기준) | Critical |
| SEC-005 | 테이블 생성 후 RLS 미활성화 | SQL 파서(migrations) | High |
| SEC-006 | RLS 정책이 `using (true)`로 전체 허용 | SQL 파서 | High |
| SEC-007 | 인증 확인 없는 Route Handler / Server Action | AST + LLM | High |
| SEC-008 | 사용자 입력을 문자열로 이어 붙인 SQL | AST | High |
| SEC-009 | 사용자 입력 없이 다른 사용자의 id로 조회/수정 가능(IDOR) | LLM | High |
| SEC-010 | `dangerouslySetInnerHTML`에 살균되지 않은 값 | AST | Medium |
| SEC-011 | CORS `Access-Control-Allow-Origin: *` + 인증 쿠키 | regex | Medium |
| SEC-012 | webhook 서명 검증 누락(Stripe, GitHub) | AST + LLM | Medium |
| SEC-013 | LLM API 호출에 사용량 제한 없음(비용 폭탄) | LLM | Medium |
| SEC-014 | 알려진 취약점이 있는 의존성 버전 | lockfile + OSV API | Low\~High |

**수정 프롬프트 형식** (발견 항목마다 생성)

```markdown
[SEC-005] supabase/migrations/0003_posts.sql 의 posts 테이블에 RLS가 꺼져 있습니다.
anon 키만 있으면 누구나 모든 글을 읽고 쓸 수 있습니다.

할 일:
1. 새 마이그레이션을 만들어 posts 에 RLS를 켜주세요.
2. 작성자만 수정/삭제, 로그인 사용자는 읽기만 가능하도록 정책을 추가하세요.
3. 기존 마이그레이션 파일은 수정하지 마세요.
확인: anon 키로 select 했을 때 빈 배열이 나오는지 테스트를 추가하세요.
```

규칙마다 ‘취약한 예시 / 안전한 예시’ 테스트 픽스처를 두고, 일부러 취약점을 심은 샘플 리포 10개로 탐지율과 오탐률을 측정합니다. 이 수치가 포트폴리오의 핵심 근거가 됩니다.

## 컨텍스트 생성기: 기술 스택별 개발 규칙

컨텍스트 생성기(2단계)는 리포의 기술 스택을 감지해서 **규칙 팩**을 골라 조합하고, 리포에서 발견한 실제 구조를 덧붙여 CLAUDE.md / .cursorrules / AGENTS.md로 내보냅니다. 1단계에서는 `projects.detected_stack`까지만 저장하고, 아래 규칙 팩은 이 프로젝트 자체의 CLAUDE.md로 먼저 씁니다.

**동작 순서**

1. 감지: `package.json`, 설정 파일(`next.config.*`, `supabase/config.toml`, `tailwind.config.*`), 폴더 구조로 스택과 버전 판별
2. 선택: 감지된 스택에 맞는 규칙 팩 조합(예: Next.js App Router + Supabase + Tailwind)
3. 보강: 실제 폴더 구조, 스크립트 명령어, 보안 점검에서 나온 취약점을 ‘주의할 점’으로 추가
4. 편집: 사용자가 규칙을 켜고 끄거나 수정, 버전으로 저장
5. 내보내기: 대상 도구별 형식으로 다운로드 또는 PR 생성

**규칙 팩 목록 (초기)**

| 규칙 팩 | 감지 조건 | 핵심 규칙 |
| --- | --- | --- |
| Next.js App Router | `next` + `app/` 디렉터리 | 라우트는 얼게, Server Component 기본, 데이터 조회는 서버에서 |
| React 컴포넌트 | `react` | 작은 단위, 비즈니스 로직 금지, props로만 동작 |
| Supabase | `@supabase/*` | RLS 필수, service\_role은 서버 전용, 마이그레이션으로만 스키마 변경 |
| TypeScript | `typescript` | strict, any 금지, 경계에서 Zod 검증 |
| Tailwind + shadcn/ui | `tailwindcss` | 디자인 토큰 사용, 임의 색상값 금지 |
| 테스트 | `vitest` / `playwright` | services는 단위 테스트, 핵심 흐름은 E2E |

**생성 결과 예시: Next.js + Supabase 프로젝트의 CLAUDE.md**

```markdown
# 프로젝트 규칙

## 기술 스택
Next.js 15 (App Router), React 19, TypeScript(strict), Supabase(PostgreSQL), Tailwind CSS, shadcn/ui, TanStack Query, Zod

## 명령어
- 개발: pnpm dev / 타입 체크: pnpm typecheck / 테스트: pnpm test
- DB 타입 생성: pnpm db:types (운영) / pnpm supabase gen types typescript --schema lego (로컬, v3 기본값)

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
- 기본 UI 는 shared/ui(shadcn/ui) 를 쓰고 새로 만들지 않는다.

## 폴더와 의존 방향
- features/<기능>/{components, hooks, actions.ts, services, repository.ts, schemas.ts}
- 의존 방향: app → components → hooks/actions → services → repository. 반대 방향 import 금지.
- 다른 feature 의 내부 파일을 import 하지 않는다. 필요하면 shared 로 옮긴다.

## 데이터 / Supabase
- 스키마 변경은 반드시 supabase/migrations 새 파일로 한다. 기존 마이그레이션은 수정하지 않는다.
- 새 테이블은 만든 직후 RLS 를 켜고 정책을 함께 작성한다. using (true) 금지.
- service_role 키는 서버(Edge Function, Server Action)에서만 쓴다. NEXT_PUBLIC_ 접두사를 붙이지 않는다.
- 쿼리는 repository.ts 에만 쓴다. 생성된 DB 타입을 사용한다.

## TypeScript / 검증
- any 금지. 외부 입력(폼, 요청, LLM 응답)은 Zod 로 검증한 뒤 사용한다.
- Server Action 은 { ok: true, data } | { ok: false, error } 를 반환하고 throw 하지 않는다.

## 스타일
- Tailwind 유틸리티와 디자인 토큰만 쓴다. 임의 값(text-[#123456]) 금지.
- 클래스 조합은 cn() 을 쓴다.

## 테스트
- services 와 scanner 규칙은 Vitest 단위 테스트를 함께 작성한다.
- 로그인 → 프로젝트 생성 → 스캔 → 결과 확인 흐름은 Playwright 로 검증한다.

## 주의할 점 (보안 점검 결과에서 자동 추가)
- [SEC-005] posts 테이블 RLS 미설정 이력 있음. 새 테이블 추가 시 특히 확인.
```

이 예시는 생성기의 출력물이자, 이 프로젝트를 바이브 코딩으로 만들 때 그대로 쓸 CLAUDE.md입니다. 자기 도구로 자기 프로젝트를 만든다는 점이 포트폴리오 스토리가 됩니다.

## 개발 일정

1단계는 3주입니다. 매주 끝에 Vercel 프리뷰에 배포 가능한 상태를 유지합니다.

1. **1주차: 기반**
   - Next.js + Supabase 프로젝트 생성, CLAUDE.md(위 템플릿) 작성, ESLint 의존 방향 규칙
   - 마이그레이션 8개 테이블 + RLS, rules 시드 데이터
   - GitHub OAuth 로그인, GitHub App 설치 후 리포 선택 → 프로젝트 생성
   - 완료 기준: 로그인해서 내 리포를 프로젝트로 등록할 수 있다
2. **2주차: 스캔 엔진**
   - packages/scanner: 규칙 SEC-001\~008 + 테스트 픽스처
   - pgmq + pg\_cron + scan-worker, 진행률 Realtime 표시
   - LLM 게이트웨이: 오탐 판별, 설명, 수정 프롬프트, llm\_calls 기록, 한도 차감
   - 완료 기준: 스캔 버튼을 누르면 발견 항목과 수정 프롬프트가 나온다
3. **3주차: 완성도**
   - 규칙 SEC-009\~014, 스캔 이력 비교(scan\_diff), 무시/해결 처리
   - 샘플 취약 리포 10개로 탐지율·오탐률 측정, README에 기록
   - 랜딩 페이지, Playwright E2E, Sentry, 2분 데모 영상
   - 완료 기준: 처음 온 사람이 로그인 → 스캔 → 수정 프롬프트 복사까지 3분 안에 끝낼 수 있다

## 2단계: 컨텍스트 생성기 (2주)

리포의 기술 스택과 실제 구조를 분석해 CLAUDE.md / .cursorrules / AGENTS.md를 만들고, 편집·버전 관리한 뒤 PR로 넣어줍니다. 규칙 팩과 출력 예시는 위 ‘컨텍스트 생성기: 기술 스택별 개발 규칙’ 섹션을 따릅니다.

**범위**

- 스택 감지: 1단계 `detected_stack`을 확장해 프레임워크 버전, 패키지 매니저, 테스트 도구, 스크립트 명령어까지 추출
- 구조 요약: 주요 폴더별 역할을 LLM이 한 줄로 설명
- 규칙 편집: 규칙 팩 항목을 켜고 끄기, 문구 수정, 직접 추가
- 보안 연동: 열려 있는 findings를 ‘주의할 점’으로 자동 추가
- 내보내기: 다운로드, 클립보드, GitHub PR 생성
- 최신화: push webhook에서 `package.json`이나 최상위 폴더가 바뀌면 ‘업데이트 필요’ 표시

**추가 테이블**

| 테이블 | 주요 컨럼 |
| --- | --- |
| `rule_packs` | id, slug, name, detect(jsonb: 필요한 패키지/파일), version |
| `rule_pack_items` | id, pack\_id, section(라우팅/컴포넌트/데이터 …), content, sort\_order, default\_enabled |
| `context_files` | id, project\_id, user\_id, target(claude\_md/cursorrules/agents\_md), current\_version\_id, outdated |
| `context_file_versions` | id, context\_file\_id, content, source(generated/edited), based\_on\_commit, created\_at |
| `context_file_rules` | context\_file\_id, item\_id, enabled, override\_content |

**API**

| 종류 | 이름 | 설명 |
| --- | --- | --- |
| Server Action | `generateContext(projectId, target)` | 감지 → 규칙 팩 조합 → 구조 요약 → 초안 버전 저장 |
| Server Action | `toggleRule(contextFileId, itemId, enabled)` | 규칙 켜기/끄기 |
| Server Action | `saveContextVersion(contextFileId, content)` | 직접 편집한 내용을 새 버전으로 |
| Server Action | `openContextPr(contextFileId)` | 브랜치 생성 → 파일 커밋 → PR 생성 |
| Route Handler | `POST /api/github/webhook` (push) | 관련 파일 변경 시 `outdated = true` |

PR 생성에는 GitHub App에 `contents: write`, `pull_requests: write` 권한이 추가로 필요합니다. 1단계 설치 사용자는 권한 재승인을 받아야 하므로, 승인 전에는 PR 버튼 대신 다운로드만 보여줍니다.

**화면**: `/projects/[projectId]/context` — 왼쪽 규칙 팩 체크리스트, 가운데 마크다운 에디터(CodeMirror), 오른쪽 미리보기와 이전 버전 대비 diff.

**LLM**: 폴더 요약은 Haiku(폴더당 파일 목록과 대표 파일 2개만 입력), 최종 문서 조합은 Sonnet. 같은 커밋 + 같은 규칙 조합이면 캐시를 씁니다.

**완료 기준**: 공개 리포 20개에서 스택 감지 정확도를 측정해 README에 기록, 생성부터 PR 생성까지 1분 안에 끝남.

## 3단계: 스펙 변환기 (2주)

한 줄 아이디어를 PRD, 데이터 모델, 화면 목록으로 만들고, 순서가 있는 작업과 작업별 구현 프롬프트로 쪼갭니다. 리포가 아직 없는 상태에서도 시작할 수 있어야 하므로 `projects.installation_id`, `repo_full_name`을 nullable로 바꿉니다.

**흐름**

1. 아이디어 입력 (예: “중고책 거래 앱”)
2. 확인 질문 3\~5개: 대상 사용자, 필수 기능, 로그인 여부, 결제 여부, 선호 스택
3. PRD 생성: 목표, 사용자, 기능(MVP / 이후), 비기능 요구사항
4. 설계 생성: 테이블과 관계, 화면 목록과 경로
5. 작업 분해: 작업마다 제목, 완료 조건, 선행 작업, 구현 프롬프트
6. 컨텍스트 연동: 스펙 요약과 스택을 2단계 생성기에 넘겨 CLAUDE.md 초안까지 만듦
7. 진행 추적: 커밋 메시지의 `[T-3]` 같은 작업 ID를 push webhook으로 읽어 완료 처리

**추가 테이블**

| 테이블 | 주요 컨럼 |
| --- | --- |
| `specs` | id, project\_id, user\_id, idea, answers(jsonb), prd\_md, data\_model(jsonb), screens(jsonb), version, status(draft/ready) |
| `spec_tasks` | id, spec\_id, user\_id, seq(T-1…), title, description, acceptance\_criteria(jsonb), depends\_on(uuid\[\]), prompt, status(todo/doing/done), done\_commit |
| `prompt_templates` | id, owner\_id(null이면 공용), title, body, tags, source(fix\_prompt/session\_insight/manual), use\_count |

**API**

| 종류 | 이름 | 설명 |
| --- | --- | --- |
| Server Action | `createSpec(idea)` | 스펙 초안 + 확인 질문 반환 |
| Server Action | `answerQuestions(specId, answers)` | 답변 저장 |
| Route Handler | `POST /api/specs/[specId]/generate` | PRD → 설계 → 작업을 스트리밍으로 생성 (응답이 길어서 Server Action 대신 사용) |
| Server Action | `updateTask(taskId, patch)` | 상태, 순서, 내용 수정 |
| Server Action | `regenerateTaskPrompt(taskId, tool)` | Claude Code / Cursor용으로 다시 생성 |
| Server Action | `linkSpecToContext(specId)` | 2단계 생성기 호출 |

**화면**: `/projects/[projectId]/spec` — 단계형 마법사(아이디어 → 질문 → 생성), PRD 에디터, 작업 보드(할 일 / 진행 중 / 완료, 선행 작업이 끝나지 않은 작업은 잠금 표시), 작업 카드의 ‘프롬프트 복사’ 버튼.

**LLM**: 모든 단계는 Zod 스키마로 구조화 출력(tool use)을 받고, 작업 그래프에 순환 의존이 있으면 다시 요청합니다. 1단계의 수정 프롬프트와 5단계의 좋은 프롬프트가 `prompt_templates`에 쌓이고, 작업 프롬프트를 만들 때 비슷한 템플릿을 예시로 넣습니다.

**완료 기준**: 아이디어 입력부터 작업 10\~20개와 CLAUDE.md 초안까지 3분 안에 나오고, 작업 ID가 들어간 커밋을 push하면 보드가 자동으로 갱신됨.

## 4단계: 학습 도우미 (1주)

AI가 만든 코드를 사용자 수준에 맞춰 설명하고, 퀴즈로 이해를 확인합니다. 1단계 발견 항목의 ‘이게 뭐예요?’ 버튼이 여기로 이어져 보안 개념을 배우게 합니다.

**범위**

- 입력: 코드 붙여넣기, 연결된 리포의 파일·줄 범위 선택, finding에서 바로 진입
- 수준 선택: 비개발자 / 초급 / 중급
- 출력: 한 줄 요약, 단계별 흐름 설명, Mermaid 흐름도, 핵심 개념 카드, 퀴즈 3문항(객관식 + 오답 해설)
- 개념 사전: RLS, IDOR, Server Component 같은 개념 페이지. 보안 규칙과 연결
- 내 학습 기록: 본 개념과 퀴즈 점수로 숙련도 표시

**추가 테이블**

| 테이블 | 주요 컨럼 |
| --- | --- |
| `concepts` | slug(rls, idor …), title, summary, body\_md, related\_rule\_ids(text\[\]) |
| `explanations` | id, user\_id, project\_id, source(paste/file/finding), source\_ref, code\_hash, level, content(jsonb), created\_at |
| `quizzes` | id, explanation\_id, questions(jsonb: 문항, 보기, 정답, 해설) |
| `quiz_attempts` | id, quiz\_id, user\_id, answers(jsonb), score, created\_at |
| `user_concepts` | user\_id, concept\_slug, mastery(0\~100), last\_seen\_at |

**API**

| 종류 | 이름 | 설명 |
| --- | --- | --- |
| Route Handler | `POST /api/explain` | 코드 + 수준 → 설명을 스트리밍, 끝나면 `explanations` 저장 |
| Server Action | `explainFinding(findingId)` | 해당 코드 조각 + 관련 개념으로 설명 생성 |
| Server Action | `submitQuiz(quizId, answers)` | 채점 후 `user_concepts.mastery` 갱신 |

**화면**: `/learn`(붙여넣기), `/learn/[explanationId]`(설명 + 흐름도 + 퀴즈), `/concepts/[slug]`(개념 페이지, 로그인 없이 공개해서 검색 유입용), 대시보드의 ‘내가 배운 개념’ 위젯.

**LLM**: `code_hash + level`로 캐시해서 같은 코드는 다시 호출하지 않습니다. Mermaid 문법 오류가 나면 클라이언트에서 렌더링 실패를 감지해 한 번 다시 생성하고, 그래도 실패하면 흐름도를 숨깁니다.

**완료 기준**: 보안 규칙 14개 모두 개념 페이지와 연결되고, finding → 설명 → 퀴즈 → 숙련도 반영까지 한 흐름으로 동작함.

## 5단계: 세션 회고·공유 (2주)

Claude Code나 Cursor 대화 로그를 올리면 비밀값을 가린 뒤 잘된 프롬프트와 막힌 지점을 요약하고, 원하면 공개 갤러리에 공유합니다. 원본 로그는 서버로 보내지 않는 것이 핵심 원칙입니다.

**범위**

- 입력 형식: Claude Code JSONL, Cursor 내보내기(마크다운), 일반 텍스트. 형식별 파서가 공통 메시지 형식(role, content, tool\_calls)으로 변환
- 마스킹 2중 처리: 브라우저에서 1차 마스킹(SEC-001 패턴, 이메일, 홈 디렉터리 경로) → 사용자가 미리보기로 확인 → 업로드 → 서버에서 2차 검사
- 분석: 목표와 결과, 잘 먹힌 프롬프트, 막힌 지점(같은 파일을 여러 번 고침, 같은 에러 반복), 턴 수와 토큰, 교훈
- 재사용: 잘 먹힌 프롬프트를 내 `prompt_templates`로 저장(3단계 작업 프롬프트에 반영)
- 갤러리: 공개 범위(비공개 / 링크 공유 / 공개), 태그와 스택 필터, 검색, 좋아요, ‘내 템플릿으로 가져오기’, 신고

**추가 테이블**

| 테이블 | 주요 컨럼 |
| --- | --- |
| `sessions` | id, user\_id, project\_id, tool(claude\_code/cursor/text), title, visibility(private/unlisted/public), slug, storage\_path, stats(jsonb), status(queued/done/failed), created\_at |
| `session_insights` | id, session\_id, kind(good\_prompt/stuck/lesson), content, prompt\_text, turn\_index |
| `session_likes` | session\_id, user\_id, created\_at |
| `session_reports` | id, session\_id, reporter\_id, reason, status(open/hidden/dismissed) |

정규화된 메시지는 행이 아니라 Storage 비공개 버킷에 JSON으로 저장합니다. 세션 하나가 수천 턴이라 DB에 넣으면 테이블이 빠르게 커지기 때문입니다. 공개 세션은 RLS에서 `visibility = 'public'`이면 anon도 읽을 수 있게 합니다.

**API**

| 종류 | 이름 | 설명 |
| --- | --- | --- |
| Server Action | `createSessionUpload()` | Storage 서명 업로드 URL 발급 + `sessions` 생성 |
| Server Action | `finalizeSession(sessionId)` | 2차 마스킹 검사 후 pgmq에 분석 작업 적재 |
| Edge Function | `session-analyzer` | 1단계 워커와 같은 큐·재시도 구조로 분석, `session_insights` 저장 |
| Server Action | `setVisibility(sessionId, visibility)` | 공개 전환 시 slug 발급 |
| Server Action | `saveInsightAsTemplate(insightId)` | `prompt_templates`로 복사 |
| Server Action | `toggleLike`, `reportSession` | 갤러리 상호작용 |

**화면**: `/sessions/new`(드래그 앤 드롭 + 마스킹 미리보기), `/sessions/[id]`(턴 타임라인 + 인사이트), `/gallery`(필터·검색), `/s/[slug]`(공개 페이지, `next/og`로 공유 이미지 생성).

**검색**: 첫 버전은 제목·태그·인사이트에 `pg_trgm` 인덱스. 의미 검색이 필요해지면 pgvector로 확장합니다.

**완료 기준**: 본인의 실제 세션(이 프로젝트를 만든 로그) 10개를 올려 갤러리에 공개하고, 마스킹 테스트 세트(비밀값을 심은 로그)에서 누출 0건.
