# 레고 (Lego)

바이브 코딩 동반자 플랫폼. GitHub 리포를 연결하면 AI로 만든 앱에서 자주 생기는 보안 실수를 찾고, 바로 붙여넣을 수 있는 수정 프롬프트를 제공합니다.

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

## 구조

- `src/app` — 라우트 전용
- `src/features/{auth,projects,scans,marketing}` — 기능별 components / hooks / actions / services / repository / schemas
- `src/shared` — 공용 UI(shadcn/ui), 유틸
- `packages/scanner` — 프레임워크 무관 스캔 엔진 (`@lego/scanner`)
- `supabase` — 마이그레이션 (`pnpm db:migrate`, 공유 프로젝트라 db push 금지)
- `tests/e2e` — Playwright

## 탐지 품질

일부러 취약점을 심은 샘플 앱 10개(문제 52개, 안전한 앱 2개 포함)로 정적 탐지 단계를 잰 값입니다. 측정 방법과 전체 결과는 [packages/scanner/benchmark/RESULTS.md](packages/scanner/benchmark/RESULTS.md) 에 있습니다.

| 단계                              | 탐지율      | 정밀도       |
| --------------------------------- | ----------- | ------------ |
| 정적 탐지 (SEC-001~014, OSV 포함) | 87% (45/52) | 87% (오탐 7) |

- 놓친 7개는 모두 일부러 넣은 어려운 변형입니다: 다른 파일의 헬퍼 안에 있는 LLM 호출, 직접 만든 허술한 sanitize, 헤더가 있을 때만 하는 서명 검증 등.
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
