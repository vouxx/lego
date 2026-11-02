# 레고 (Lego)

바이브 코딩 동반자 플랫폼. GitHub 리포를 연결하면 AI로 만든 앱에서 자주 생기는 보안 실수를 찾고, 바로 붙여넣을 수 있는 수정 프롬프트를 제공합니다.

- 전체 설계: [docs/design.md](docs/design.md)
- 개발 규칙: [CLAUDE.md](CLAUDE.md)

## 시작하기

```bash
pnpm install            # pnpm 이 없으면 npx pnpm@12.16.1 install
cp .env.example .env.local
pnpm supabase start     # 로컬 Supabase (Docker 필요)
pnpm dev
```

## 구조

- `src/app` — 라우트 전용
- `src/features/{projects,scans,findings}` — 기능별 components / hooks / actions / services / repository / schemas
- `src/shared` — 공용 UI(shadcn/ui), 유틸
- `packages/scanner` — 프레임워크 무관 스캔 엔진 (`@lego/scanner`)
- `supabase` — 마이그레이션, Edge Functions(scan-worker), 시드
