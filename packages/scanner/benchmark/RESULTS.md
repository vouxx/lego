# 탐지율 측정 결과

샘플 10개, 심어 둔 문제 52개. 정적 탐지 단계만 잰 값이다(AI 판별 전).
SEC-014 는 OSV 조회를 포함했다.

- **탐지율(recall)**: 87% (45/52)
- **정밀도(precision)**: 87% — 오탐 7개

## 규칙별

| 규칙    | 탐지 | 놓침 | 오탐 | 탐지율 |
| ------- | ---- | ---- | ---- | ------ |
| SEC-001 | 5    | 0    | 2    | 100%   |
| SEC-002 | 3    | 0    | 0    | 100%   |
| SEC-003 | 5    | 1    | 0    | 83%    |
| SEC-004 | 2    | 1    | 0    | 67%    |
| SEC-005 | 3    | 0    | 0    | 100%   |
| SEC-006 | 2    | 0    | 0    | 100%   |
| SEC-007 | 5    | 1    | 1    | 83%    |
| SEC-008 | 2    | 0    | 0    | 100%   |
| SEC-009 | 5    | 1    | 3    | 83%    |
| SEC-010 | 2    | 1    | 1    | 67%    |
| SEC-011 | 2    | 0    | 0    | 100%   |
| SEC-012 | 2    | 1    | 0    | 67%    |
| SEC-013 | 2    | 1    | 0    | 67%    |
| SEC-014 | 5    | 0    | 0    | 100%   |

## 샘플별

| 샘플              | 설명                                                                                                                                                                                        | 탐지 | 놓침 | 오탐 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- |
| 01-supabase-todo  | Supabase 할 일 앱: RLS 누락·using(true) 정책·클라이언트 컴포넌트의 service_role 키                                                                                                          | 5    | 0    | 0    |
| 02-ai-chat        | AI 채팅 앱: 브라우저에 노출된 OpenAI 키, 하드코딩된 Anthropic 키, 사용량 제한 없는 LLM 라우트, messages 테이블 RLS 누락                                                                     | 6    | 1    | 0    |
| 03-stripe-shop    | Stripe 쇼핑몰: 서명 검증 없는 웹훅, 하드코딩된 live 키, 주문 IDOR, 클라이언트의 service_role 키                                                                                             | 5    | 1    | 1    |
| 04-blog-cms       | 개발 블로그 CMS: 마크다운을 그대로 innerHTML, 문자열로 이어 붙인 SQL, 인증 없는 삭제 Server Action, 취약한 marked                                                                           | 5    | 1    | 0    |
| 05-express-api    | 파트너 API (pages/api): 요청 Origin 반사 + credentials CORS, 인증 없는 회원 API, 취약한 lodash                                                                                              | 6    | 1    | 0    |
| 06-github-bot     | GitHub 슬래시 명령 봇: 커밋된 .env, env 규칙 없는 .gitignore, 하드코딩된 GitHub 토큰, 서명 검증 없는 웹훅                                                                                   | 4    | 1    | 0    |
| 07-saas-dashboard | 팀 대시보드 SaaS: admin 클라이언트로 소유자 확인 없는 프로젝트 조회/삭제, 인증 없는 Server Action, 하드코딩된 service_role 키, 취약한 의존성                                                | 8    | 1    | 0    |
| 08-vite-react     | Vite + React 마켓: VITE_ 접두사 비밀 키, 브라우저의 AWS 키·Stripe 비밀 키, 살균 없는 상품 설명 HTML, insert with check (true)                                                               | 6    | 1    | 0    |
| 09-safe-app       | 같은 기능을 올바르게 구현한 안전한 앱 (RLS·소유자 정책, 인증, DOMPurify, 웹훅 서명 검증, 사용량 제한, 파라미터 SQL)                                                                         | 0    | 0    | 0    |
| 10-tricky-safe    | 위험해 보이지만 안전한 경우: 테스트 픽스처의 가짜 키, 하드코딩된 anon 키, 이스케이프한 JSON-LD, 변수로 거친 DOMPurify, server-only admin, 헬퍼 안의 getClaims, 나중 마이그레이션에서 켠 RLS | 0    | 0    | 6    |

## 놓친 항목

- 02-ai-chat SEC-013 app/api/title/route.ts:15 — (어려운 변형) LLM 호출이 lib/llm.ts 헬퍼 안에 있어 라우트 본문에는 보이지 않음, 사용량 제한 없음
- 03-stripe-shop SEC-009 app/account/orders/[id]/page.tsx:17 — (어려운 변형) Route Handler 가 아닌 Server Component 에서 admin 클라이언트로 남의 주문 조회 (로그인만 확인)
- 04-blog-cms SEC-010 components/CommentList.tsx:20 — (어려운 변형) 직접 만든 sanitize() 가 script 태그만 지워 <img onerror> 등으로 우회 가능한 댓글 XSS
- 05-express-api SEC-007 pages/api/orders.ts:5 — (어려운 변형) session 쿠키가 있는지만 보고 토큰 검증 없이 body 의 userId 로 주문 생성
- 06-github-bot SEC-012 app/api/github/webhook/route.ts:5 — (어려운 변형) 서명 헤더가 있을 때만 검증해서 헤더를 빼면 우회 (/merge 명령 실행 가능)
- 07-saas-dashboard SEC-004 components/TeamTable.tsx:4 — (어려운 변형) "use client" 컴포넌트가 service_role 키를 담은 admin 모듈을 import (파일 안에 service_role 글자가 없음)
- 08-vite-react SEC-003 src/lib/payments.ts:4 — (어려운 변형) 이름에 SECRET 이 없지만 Stripe 서버 SDK(환불)에 쓰는 비밀 키를 VITE_ 로 노출

## 오탐

- 03-stripe-shop SEC-009 app/api/webhooks/stripe/route.ts:14 — Route Handler POST 가 요청으로 받은 id 로 데이터를 다루는데 소유자 확인이 보이지 않음
- 10-tricky-safe SEC-001 **tests**/redact.test.ts:5 — OpenAI API 키 형식의 값
- 10-tricky-safe SEC-001 **tests**/redact.test.ts:6 — Stripe 비밀 키 형식의 값
- 10-tricky-safe SEC-007 app/admin/actions.ts:14 — Server Action publishProduct 안에서 인증 확인 호출을 찾지 못함
- 10-tricky-safe SEC-009 app/admin/actions.ts:16 — Server Action publishProduct 가 요청으로 받은 id 로 데이터를 다루는데 소유자 확인이 보이지 않음
- 10-tricky-safe SEC-009 app/api/products/[id]/route.ts:10 — Route Handler GET 가 요청으로 받은 id 로 데이터를 다루는데 소유자 확인이 보이지 않음
- 10-tricky-safe SEC-010 app/products/[slug]/page.tsx:31 — dangerouslySetInnerHTML 에 들어가는 값이 살균 함수를 거치지 않음
