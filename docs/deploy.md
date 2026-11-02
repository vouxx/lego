# 배포 (Vercel)

- 프로젝트: Vercel `vouxxs-projects/lego`, 함수 리전 `icn1`(Supabase 와 같은 서울)
- 운영 주소: https://lego-six-coral.vercel.app
- 배포: `vercel deploy --prod --scope vouxxs-projects` (GitHub 연결 후에는 main push 로 자동)
- 환경 변수는 Vercel Production 에 있다. `SCAN_WORKER_SECRET` 은 로컬과 다른 운영 전용 값이다.

## 운영에서 로그인·리포 연결이 되려면

### 1. Supabase 리다이렉트 URL

공유 프로젝트이므로 **Site URL 은 바꾸지 않는다.**
Authentication → URL Configuration → Redirect URLs 에 추가:

```
https://lego-six-coral.vercel.app/auth/callback
```

### 2. 운영용 GitHub App

개발용 App(`lego-dev-vouxx`)은 설치 후 돌아올 주소가 localhost 라서, 운영용 App 을 하나 더 만든다.
만드는 방법은 [setup-github.md](setup-github.md) 와 같고, 주소만 다르다.

| 항목 | 값 |
|---|---|
| Homepage URL | `https://lego-six-coral.vercel.app` |
| Callback URL | `https://lego-six-coral.vercel.app/api/github/install/callback` |
| Request user authorization (OAuth) during installation | 체크 |
| Webhook URL | `https://lego-six-coral.vercel.app/api/github/webhook` |
| Webhook secret | `openssl rand -hex 32` |
| 권한 | Contents: Read-only, Metadata: Read-only |

만든 값은 저장소 루트의 `.env.production.local`(git 에 안 올라감)에 아래 이름으로 적는다.
그다음 Vercel 에 올리고 다시 배포한다.

```
GITHUB_APP_ID=
GITHUB_APP_SLUG=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

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
select vault.create_secret('https://lego-six-coral.vercel.app/api/scan-worker', 'lego_scan_worker_url');
select vault.create_secret('<운영 SCAN_WORKER_SECRET>', 'lego_scan_worker_secret');
```
