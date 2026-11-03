# 스택 감지 정확도

측정일 2026-11-03, 공개 리포 20개. `npx tsx scripts/stack-bench.mts` 로 다시 잰다.

정답은 리포마다 패키지별 의존성과 app/pages 폴더(`--evidence`)를 사람이 보고 매겼다. 예시·문서 사이트는 뺐다.

| 방식 | 리포 단위 완전 일치 | 태그 정밀도 | 태그 재현율 |
|---|---|---|---|
| 루트 package.json 만 (이전) | 13/20 | 100% | 70% |
| 워크스페이스 전체 (현재) | 18/20 | 98% | 99% |

| 리포 | package.json 수 | 정답 | 루트만 | 현재 |
|---|---|---|---|---|
| vouxx/lego | 5 | nextjs-app-router, playwright, react, supabase, tailwind, typescript, vitest | nextjs-app-router, playwright, react, supabase, tailwind, typescript, vitest | nextjs-app-router, playwright, react, supabase, tailwind, typescript, vitest |
| vouxx/ZEEK | 1 | nextjs-app-router, react, supabase, tailwind, typescript | nextjs-app-router, react, supabase, tailwind, typescript | nextjs-app-router, react, supabase, tailwind, typescript |
| vercel/commerce | 1 | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript |
| vercel/ai-chatbot | 1 | nextjs-app-router, playwright, react, tailwind, typescript | nextjs-app-router, playwright, react, tailwind, typescript | nextjs-app-router, playwright, react, tailwind, typescript |
| nextjs/saas-starter | 1 | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript |
| vercel/nextjs-subscription-payments | 1 | nextjs-app-router, react, supabase, tailwind, typescript | nextjs-app-router, react, supabase, tailwind, typescript | nextjs-app-router, react, supabase, tailwind, typescript |
| shadcn-ui/taxonomy | 1 | nextjs-app-router, nextjs-pages-router, react, tailwind, typescript | nextjs-app-router, nextjs-pages-router, react, tailwind, typescript | nextjs-app-router, nextjs-pages-router, react, tailwind, typescript |
| mckaywrigley/chatbot-ui | 2 | jest, nextjs-app-router, react, supabase, tailwind, typescript | jest, nextjs-app-router, react, supabase, tailwind, typescript | jest, nextjs-app-router, react, supabase, tailwind, typescript |
| umami-software/umami | 3 | nextjs-app-router, playwright, react, typescript, vitest | nextjs-app-router, playwright, react, typescript, vitest | nextjs-app-router, playwright, react, typescript, vitest |
| excalidraw/excalidraw | 12 | react, typescript, vite, vitest | typescript, vite, vitest | react, typescript, vite, vitest |
| calcom/cal.com | 119 | jest, nextjs-app-router, nextjs-pages-router, playwright, react, tailwind, typescript, vite, vitest | playwright, typescript, vitest | jest, nextjs-app-router, nextjs-pages-router, playwright, react, tailwind, typescript, vitest |
| documenso/documenso | 17 | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest | react, typescript, vite | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest |
| formbricks/formbricks | 26 | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest | playwright, vite, vitest | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest |
| dubinc/dub | 10 | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest | (없음) | nextjs-app-router, playwright, react, tailwind, typescript, vite, vitest |
| supabase/supabase | 69 | nextjs-app-router, nextjs-pages-router, react, supabase, tailwind, typescript, vite, vitest | supabase, tailwind, typescript | nextjs-app-router, nextjs-pages-router, react, supabase, tailwind, typescript, vite, vitest |
| t3-oss/create-t3-app | 4 | typescript | typescript | react, tailwind, typescript |
| outline/outline | 1 | react, typescript, vite, vitest | react, typescript, vite, vitest | react, typescript, vite, vitest |
| vercel/platforms | 1 | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript | nextjs-app-router, react, tailwind, typescript |
| steven-tey/novel | 4 | nextjs-app-router, react, tailwind, typescript | (없음) | nextjs-app-router, react, tailwind, typescript |
| pmndrs/zustand | 3 | react, typescript, vitest | react, typescript, vitest | react, typescript, vitest |

## 틀린 2개

- calcom/cal.com: `vite` 를 놓쳤다. package.json 이 119개라 얕은 경로부터 40개만 보는데, vite 를 쓰는 `packages/embeds/*`·`packages/platform/*` 가 그 밖에 있다.
- t3-oss/create-t3-app: `react`, `tailwind` 를 더 붙였다. `cli/package.json` 의 next·react·tailwind 는 CLI 가 만들어 줄 템플릿의 버전 표시일 뿐, 이 리포가 쓰는 스택이 아니다.

