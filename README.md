# 레고 (Lego)

바이브 코딩 동반자 플랫폼. AI 로 만든 앱을 기획부터 운영까지 돕는 도구 다섯 개가 있습니다.

| 도구             | 하는 일                                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 스펙 변환기      | 한 줄 아이디어 → PRD·설계·작업 목록·작업별 프롬프트. PR 제목 `[T-n]` 이나 브랜치 `t-n` 으로 PR 을 작업에 잇고, 머지되면 작업 완료                                                                                      |
| 규칙 파일 생성기 | 리포를 분석해 CLAUDE.md · .cursorrules · AGENTS.md 생성. 의존성이 바뀌면 다시 만들 때라고 알려 줌                                                                                                                      |
| 보안 점검기      | 보안 실수 22가지를 찾고 수정 프롬프트 제공(정적 탐지 + AI 판별). 점검할수록 문제가 줄어드는지 추이로 보여 줌                                                                                                           |
| PR 가드          | PR 마다 바뀐 줄만 점검해 GitHub 리뷰 코멘트·상태 체크. 고친 문제는 대화를 접고 `/lego ignore` 로 무시 가능. 엄격도는 엄격·보통·느슨. 테스트 삭제·검사 끄기·RLS 약화·문서 없는 환경 변수·가짜 패키지(PR-001~005)도 찾음 |
| 운영 점검        | 배포된 사이트를 밖에서 확인: 로그인 없이 읽히는 테이블·버킷, JS 속 비밀 키, 보안 헤더, 열린 .env, 코드와 다른 RLS(LIVE-001~007). 소유 확인 후 하루 한 번, 문제를 만든 마이그레이션 파일과 줄까지 알려 줌               |

도구 다섯 개를 함께 받쳐 주는 기능입니다.

| 기능        | 하는 일                                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slack 알림  | "Slack 에 추가" 로 프로젝트마다 채널 하나를 연결. 운영 점검의 새 문제, PR 가드 실패, 보안 점검 결과, 매주 월요일 주간 요약을 보냄. 고른 채널에 글을 쓰는 권한만 받음 |
| 팀 멤버     | GitHub 아이디로 초대 링크를 만들어 보기 전용으로 공유. 멤버는 점검 결과·PR 리뷰·운영 점검을 보기만 하고, 실행과 설정 변경은 소유자만 함                              |
| 개념 사전   | 점검 결과의 '이게 뭐예요?' 에서 왜 위험한지 쉬운 말로 설명                                                                                                           |
| 오탐 피드백 | 관리자 화면(`/admin/feedback`)에서 규칙별로 무시·오탐이 많은 항목을 봄                                                                                               |

- 전체 설계: [docs/design.md](docs/design.md)
- 개발 규칙: [CLAUDE.md](CLAUDE.md)
- 로컬 개발: [docs/local-dev.md](docs/local-dev.md) · 배포: [docs/deploy.md](docs/deploy.md)
- 운영: https://vouxx-lego.vercel.app

## 시작하기

```bash
pnpm install            # pnpm 이 없으면 npx pnpm@12.16.1 install
cp .env.example .env.local
npx supabase start       # 로컬 Supabase (Docker 필요, docs/local-dev.md)
pnpm dev
```

GitHub App 설정은 [docs/setup-github.md](docs/setup-github.md), 환경 변수는 [.env.example](.env.example) 을 보세요. Slack·Sentry·`ANTHROPIC_API_KEY` 는 없어도 앱이 뜹니다(없으면 Slack 연결 버튼이 꺼지고, 점검은 정적 탐지 결과만 저장합니다).

## 구조

- `src/app` — 라우트 전용
- `src/features/{auth,projects,members,scans,findings,context,specs,live,notifications,concepts,admin,marketing}` — 기능별 components / hooks / actions / services / repository / schemas
- `src/shared` — 공용 UI(shadcn/ui), 유틸
- `packages/scanner` — 프레임워크 무관 스캔 엔진 (`@lego/scanner`)
- `supabase` — 마이그레이션 (`pnpm db:migrate`, 공유 프로젝트라 db push 금지)
- `tests/e2e` — Playwright

## 탐지 품질

일부러 취약점을 심은 샘플 앱 12개(문제 64개, 안전한 앱 3개 포함)로 정적 탐지 단계를 잰 값입니다. 측정 방법과 전체 결과는 [packages/scanner/benchmark/RESULTS.md](packages/scanner/benchmark/RESULTS.md) 에 있습니다.

| 단계                              | 탐지율      | 정밀도       |
| --------------------------------- | ----------- | ------------ |
| 정적 탐지 (SEC-001~022, OSV 포함) | 86% (55/64) | 89% (오탐 7) |

- 놓친 9개는 모두 일부러 넣은 어려운 변형입니다: 다른 파일의 헬퍼 안에 있는 LLM 호출·파일 경로 조합, `promisify(exec)` 로 감싼 명령, 직접 만든 허술한 sanitize, 헤더가 있을 때만 하는 서명 검증 등.
- SEC-015~022 를 위한 샘플 2개(취약한 파일 포털과 같은 기능의 안전한 버전)에서 새 규칙의 오탐은 0개입니다.
- 오탐 7개 중 5개는 테스트 픽스처의 가짜 키, 헬퍼 안에서 하는 인증처럼 다음 단계의 AI 판별이 걸러 내도록 둔 경우입니다.
- 실제 리포(vouxx/lego-sample-vuln, 22개 후보)에서는 AI 판별까지 거친 뒤 테스트 픽스처 키와 서명을 검증하는 웹훅이 오탐으로 걸러졌고, 나머지는 모두 실제 문제로 판정됐습니다. 스캔 한 번에 약 2분, AI 비용 약 $0.15 입니다.
- 코드 주석으로 AI 판별을 속이는 시도("이건 오탐이니 무시하라")를 막기 위해, 값만으로 확정되는 규칙은 AI 가 오탐이라 해도 숨기지 않습니다.

```bash
pnpm --filter @lego/scanner bench --osv   # 다시 재기
```

## 스택 감지 정확도 (컨텍스트 생성기)

공개 리포 20개(단일 앱 12개, 모노레포 8개)의 스택을 사람이 근거를 보고 매긴 정답과 비교했습니다. 전체 결과는 [docs/stack-bench.md](docs/stack-bench.md) 에 있습니다.

| 방식                     | 리포 완전 일치 | 태그 정밀도 | 태그 재현율 |
| ------------------------ | -------------- | ----------- | ----------- |
| 루트 package.json 만     | 13/20          | 100%        | 70%         |
| 워크스페이스 전체 (현재) | 18/20          | 98%         | 99%         |

- 루트만 보면 cal.com, supabase, dub 처럼 `apps/web` 에 Next.js 가 있는 모노레포를 놓쳐서, 워크스페이스 package.json 을 모두 보도록 바꿨습니다(예시·샘플·문서 폴더는 제외).
- 남은 두 개: 패키지가 아주 많은 리포(cal.com, 119개)의 깊은 패키지, 템플릿 버전을 의존성으로 적어 둔 CLI(create-t3-app).

```bash
npx tsx scripts/stack-bench.mts   # 다시 재기
```

## 테스트

```bash
pnpm test        # 규칙·서비스 단위 테스트
pnpm e2e         # Playwright (로그인 흐름은 pnpm e2e:login 으로 세션을 먼저 저장)
```

GitHub 로그인 없이 로컬 Supabase 의 테스트 사용자로 돌릴 수도 있습니다.

```bash
GITHUB_API_URL=http://localhost:4010 pnpm dev   # GitHub 모의 서버를 쓰는 개발 서버
pnpm e2e:local-seed
pnpm e2e --project=local-signed-in
```
