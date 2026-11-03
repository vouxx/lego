# 배포 (Vercel)

- 프로젝트: Vercel `vouxxs-projects/lego`, 함수 리전 `icn1`(Supabase 와 같은 서울)
- 운영 주소: https://vouxx-lego.vercel.app
- 배포: `vercel deploy --prod --scope vouxxs-projects` (GitHub 연결 후에는 main push 로 자동)
- 환경 변수는 Vercel Production 에 있다. `SCAN_WORKER_SECRET` 은 로컬과 다른 운영 전용 값이다.

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

### 2-1. 규칙 파일 PR 권한 (2단계)

컨텍스트 생성기가 PR 을 열려면 두 App(`lego-security`, `lego-dev-vouxx`) 모두에 권한과 이벤트를 추가한다.
App 설정 → Permissions & events:

- Repository permissions → **Contents: Read and write**, **Pull requests: Read and write**
- Subscribe to events → **Push** (규칙 파일 '업데이트 필요' 표시)

권한을 늘리면 이미 설치한 사용자는 GitHub 에서 새 권한을 승인해야 한다. 승인 전에는 화면에 'PR 만들기 권한 허용하기' 버튼만 보인다.

### 3. main push 자동 배포

Vercel 대시보드 → lego → Settings → Git 에서 `vouxx/lego` 를 연결한다.
Vercel GitHub App 에 이 리포 접근 권한이 있어야 한다.

## 워커 주기 실행 (pg_cron)

스캔은 시작할 때 `after()` 로 바로 처리한다. 서버 재시작이나 재시도 대기로 남은 작업은 pg_cron 이 5분마다 줍는다.
처리할 작업이 있을 때만 워커를 호출한다.

- 마이그레이션: `supabase/migrations/20261103000002_lego_worker_cron.sql`
  - 공유 프로젝트에 `pg_cron`, `pg_net` 확장을 켠다.
- Vault 에 운영 URL 과 워커 비밀값을 넣는다(저장소에는 두지 않음).

```sql
select vault.create_secret('https://vouxx-lego.vercel.app/api/scan-worker', 'lego_scan_worker_url');
select vault.create_secret('<운영 SCAN_WORKER_SECRET>', 'lego_scan_worker_secret');
```

## 2~5단계 운영 반영 순서

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

공유 프로젝트에 추가되는 것은 `lego` 스키마 객체, `extensions` 스키마의 `pg_trgm`(이미 있으면 그대로), Storage 버킷 `lego-sessions` 하나다.

## 운영 점검 (로그인 흐름)

GitHub 로그인은 자동화하지 않으므로 세션을 한 번 저장한 뒤 돌린다. 테스트가 만든 설명·세션·스펙·임시 프로젝트는 끝에 지운다.

```bash
E2E_BASE_URL=https://vouxx-lego.vercel.app E2E_AUTH_FILE=tests/e2e/.auth/prod.json pnpm e2e:login
E2E_BASE_URL=https://vouxx-lego.vercel.app pnpm e2e --project=prod-signed-in
```

- 규칙 파일(vouxx/ZEEK), 학습(붙여넣기·점검 결과), 회고(마스킹), 스펙, 공개 리포 등록·삭제를 한 번씩 돈다. 약 3분, AI 비용 약 $0.3.
