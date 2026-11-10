# 배포 (Vercel)

- 프로젝트: Vercel `vouxxs-projects/lego`, 함수 리전 `icn1`(Supabase 와 같은 서울)
- 운영 주소: https://vouxx-lego.vercel.app
- 배포: `vercel deploy --prod --scope vouxxs-projects` (GitHub 연결 후에는 main push 로 자동)
- 환경 변수는 Vercel Production 에 있다. `SCAN_WORKER_SECRET` 은 로컬과 다른 운영 전용 값이다. `ADMIN_USER_IDS` 에는 관리자 화면(/admin/feedback)을 볼 계정의 auth user id 를 넣는다. 사용자용 Slack 알림은 api.slack.com 의 lego 앱(App ID A0CEKH9UP61, 권한 incoming-webhook, redirect `https://vouxx-lego.vercel.app/api/slack/oauth/callback`)의 `SLACK_CLIENT_ID`·`SLACK_CLIENT_SECRET` 을 쓴다. 다른 워크스페이스에서 쓰려면 앱의 Manage Distribution 을 켠다.

## 운영에서 로그인·리포 연결이 되려면

### 1. Supabase 리다이렉트 URL

공유 프로젝트이므로 **Site URL 은 바꾸지 않는다.**
Authentication → URL Configuration → Redirect URLs 에 추가:

```
https://vouxx-lego.vercel.app/auth/callback
```

### 2. 운영용 GitHub App

운영용 App 은 [`lego-security`](https://github.com/apps/lego-security) 이다(공개, Contents·Metadata 읽기 전용).
GitHub App Manifest 흐름으로 만들었고, 자격 증명은 `.env.production.local`(git 제외)과 Vercel Production 에 있다.
개발용 `lego-dev-vouxx` 는 로컬(localhost) 전용으로 그대로 둔다.

| 항목 | 값 |
|---|---|
| Homepage URL | `https://vouxx-lego.vercel.app` |
| Callback URL | `https://vouxx-lego.vercel.app/api/github/install/callback` |
| Webhook URL | `https://vouxx-lego.vercel.app/api/github/webhook` |

운영 도메인을 바꾸면 위 세 값을 함께 바꾼다. Webhook URL 은 App JWT 로 `PATCH /app/hook/config` 를 호출해 바꿀 수 있다.
Homepage·Callback URL 은 https://github.com/settings/apps/lego-security 에서 직접 바꾼다.

### 2-1. 쓰기 권한과 이벤트 (규칙 파일 PR, 작업 자동 완료, PR 가드)

두 App(`lego-security`, `lego-dev-vouxx`) 모두에 권한과 이벤트를 추가한다. App 설정 → Permissions & events:

- Repository permissions
  - **Contents: Read and write** — 규칙 파일 PR
  - **Pull requests: Read and write** — 규칙 파일 PR, PR 가드 리뷰 코멘트
  - **Checks: Read and write** — PR 가드 상태 체크
- Subscribe to events
  - **Push** — 규칙 파일 '업데이트 필요', 커밋 `[T-n]` 으로 스펙 작업 완료
  - **Pull request** — PR 가드
  - **Pull request review comment** — PR 가드 `/lego ignore` 답글

권한을 늘리면 이미 설치한 사용자는 GitHub 에서 새 권한을 승인해야 한다.
승인 전에도 PR 가드는 레고 화면에 결과를 남기고, GitHub 게시가 막힌 이유("권한이 없습니다")를 보여 준다.

### 3. main push 자동 배포

Vercel 대시보드 → lego → Settings → Git 에서 `vouxx/lego` 를 연결한다.
Vercel GitHub App 에 이 리포 접근 권한이 있어야 한다.

## 워커 주기 실행 (pg_cron)

스캔은 시작할 때 `after()` 로 바로 처리한다. 서버 재시작이나 재시도 대기로 남은 작업은 pg_cron 이 5분마다 줍는다.
처리할 스캔 작업이 있거나, 하루가 지난 운영 점검 대상이 있을 때만 워커를 호출한다(20261104000003 에서 함수를 바꿈).

- 마이그레이션: `supabase/migrations/20261103000002_lego_worker_cron.sql`
  - 공유 프로젝트에 `pg_cron`, `pg_net` 확장을 켠다.
- Vault 에 운영 URL 과 워커 비밀값을 넣는다(저장소에는 두지 않음).

```sql
select vault.create_secret('https://vouxx-lego.vercel.app/api/scan-worker', 'lego_scan_worker_url');
select vault.create_secret('<운영 SCAN_WORKER_SECRET>', 'lego_scan_worker_secret');
```

## 운영 반영 순서

새 코드가 새 테이블을 쓰므로 **마이그레이션을 먼저** 적용한 뒤 push 한다(개념 사전은 빌드 때 운영 DB 에서 읽어 정적 생성한다).

```bash
pnpm db:migrate   # 20261103000004 ~ 20261103000007
git push origin main
```

| 마이그레이션 | 내용 |
|---|---|
| 20261103000004_lego_context | 규칙 팩·규칙 파일·버전 |
| 20261103000005_lego_specs | 스펙·작업·프롬프트 템플릿 |
| 20261103000006_lego_learning | 개념 사전(15개)·설명·퀴즈·숙련도 |
| 20261103000007_lego_sessions | 세션·인사이트·좋아요·신고, `pg_trgm`, 비공개 Storage 버킷 `lego-sessions` |
| 20261103000008_lego_rules_more | 보안 규칙 SEC-015~022, 개념 8개 |
| 20261104000001_lego_drop_learn_sessions | 학습 도우미·세션 회고 테이블 삭제(개념 사전은 남김) |
| 20261104000002_lego_pr_guard | PR 가드: `projects.pr_guard_enabled`, PR 리뷰·발견 항목 |
| 20261104000003_lego_live_checks | 운영 점검 대상·결과, 워커 호출 조건에 일일 점검 추가 |
| 20261104000004_lego_pr_guard_tracking | PR 가드: fingerprint·코멘트 id·무시 상태·체크 id |
| 20261106000001_lego_weekly_digest | 주간 요약(`notify_weekly`, `last_weekly_at`), `kick_scan_worker` 갱신 |
| 20261106000002_lego_project_members | 팀 멤버·초대, 멤버 읽기 정책, `accept_project_invite` |
| 20261107000001_lego_security_hardening | 설치를 사용자별로 연결, `pr_reviews.trusted_author`, `pr_review_findings.context_hash`, 초대 수락 시 멤버 수 제한 |

학습 도우미·세션 회고는 없앴다. 비공개 Storage 버킷 `lego-sessions` 는 SQL 로 지울 수 없어 2026-11-04 에 대시보드에서 지웠다.
`extensions.pg_trgm` 은 다른 앱이 쓸 수 있어 그대로 둔다.

## 운영 점검 (로그인 흐름)

GitHub 로그인은 자동화하지 않으므로 세션을 한 번 저장한 뒤 돌린다. 테스트가 만든 스펙·임시 프로젝트는 끝에 지운다.

```bash
E2E_BASE_URL=https://vouxx-lego.vercel.app E2E_AUTH_FILE=tests/e2e/.auth/prod.json pnpm e2e:login
E2E_BASE_URL=https://vouxx-lego.vercel.app pnpm e2e --project=prod-signed-in
```

- 규칙 파일(vouxx/ZEEK), 점검 결과의 개념 링크, 스펙, 공개 리포 등록·삭제를 한 번씩 돈다. 약 2분, AI 비용 약 $0.25.
- `onboarding-flow` 는 등록 안 된 공개 리포(`E2E_ONBOARD_REPO`)로 등록 → 점검 → 프롬프트 복사까지 시간을 잰다(3분 기준).

## Supabase 프로젝트 분리 절차

레고를 공유 프로젝트(`kqspyogrfebnlitqchvd`)에서 독립 프로젝트로 옮길 때의 순서다. 분리하기 전까지는 레고의 secret 키가 유출되면 같은 프로젝트의 다른 앱까지 영향을 받는다.

1. 새 프로젝트를 만든다(추가 비용 있음). 마이그레이션 전체를 새 프로젝트에 적용한다. 새 프로젝트는 레고 전용이므로 `pnpm db:migrate` 를 그대로 쓸 수 있다.
2. GitHub OAuth 를 새 프로젝트에 설정한다(GitHub OAuth App 의 Callback URL 도 바꾼다). Site URL 과 Redirect URLs 를 레고 주소로 설정한다.
3. `scan-worker` 주소와 비밀값을 새 프로젝트의 Vault 에 넣는다.
4. 공유 프로젝트의 `lego` 스키마 데이터를 내보내 새 프로젝트로 옮긴다. `auth.users` 는 레고 사용자(`lego.profiles` 의 id)와 그 `auth.identities` 만 옮긴다. id 가 유지돼야 외래 키가 맞는다.
5. Vercel 의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` 를 바꿔 재배포한다. 기존 세션은 끊기므로 사용자는 다시 로그인한다.
6. 동작을 확인한 뒤 공유 프로젝트에서 cron 작업을 끄고, 며칠 뒤 `lego` 스키마를 지운다.

## Preview 배포

`main` 밖의 브랜치는 배포하지 않는다(`vercel.json` 의 `git.deploymentEnabled`). Preview 환경에는 환경 변수를 넣지 않는다. 넣으면 Dependabot PR 을 포함한 모든 브랜치 빌드가 운영 DB 의 secret 키를 갖게 된다. PR 의 코드 검사는 GitHub Actions(`ci`)가 한다.

## iframe 허용 출처

공개 페이지(`/`, `/concepts…`)를 다른 사이트에서 iframe 으로 띄우려면 Vercel production 환경 변수 `FRAME_ANCESTORS` 에 출처를 공백으로 구분해 넣는다(`https://` 로 시작하는 출처만 받는다). 값은 리포에 적지 않는다. 비우면 레고 자신만 띄울 수 있다.
