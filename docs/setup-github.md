# GitHub 로그인 · GitHub App 설정

레고는 GitHub를 두 가지로 씁니다.

| 용도 | 무엇 | 콜백 |
| --- | --- | --- |
| 로그인 | Supabase Auth의 GitHub 프로바이더 (OAuth App) | `https://kqspyogrfebnlitqchvd.supabase.co/auth/v1/callback` |
| 리포 읽기 | 레고 GitHub App (설치 토큰) | `<사이트>/api/github/install/callback` |

## 1. Supabase

Supabase 프로젝트 `kqspyogrfebnlitqchvd`는 다른 앱(zeek, wbs, resume)과 같이 씁니다. 아래 설정은 프로젝트 전체에 적용되므로 기존 값을 지우지 말고 **추가만** 합니다.

1. **Project Settings → Data API → Exposed schemas**에 `lego`를 추가합니다.
2. **Authentication → Sign In / Providers → GitHub**
   - 이미 켜져 있으면 그대로 둡니다. 로그인 화면에 기존 OAuth App 이름이 보일 뿐 동작은 같습니다.
   - 꺼져 있으면 GitHub에서 OAuth App을 새로 만듭니다 (github.com/settings/developers → New OAuth App).
     - Authorization callback URL: `https://kqspyogrfebnlitqchvd.supabase.co/auth/v1/callback`
     - Client ID와 Client Secret을 Supabase에 넣고 켭니다.
3. **Authentication → URL Configuration → Redirect URLs**에 추가합니다. Site URL은 바꾸지 않습니다.
   - `http://localhost:3000/auth/callback`
   - 배포 후: `https://<배포 도메인>/auth/callback`
4. **Project Settings → API Keys**에서 publishable key와 secret key를 `.env.local`에 넣습니다.

## 2. GitHub App 만들기

github.com/settings/apps/new (조직 소유로 만들려면 조직 Settings → Developer settings → GitHub Apps)

| 항목 | 값 |
| --- | --- |
| GitHub App name | 예: `lego-dev` (전역에서 유일해야 함. URL의 slug가 됨) |
| Homepage URL | `http://localhost:3000` |
| Callback URL | `http://localhost:3000/api/github/install/callback` (배포 후 배포 주소도 추가) |
| **Request user authorization (OAuth) during installation** | **체크 (필수)** |
| Webhook → Active | 배포 전에는 해제해도 됩니다. 켜려면 공개 URL `https://<배포 도메인>/api/github/webhook` |
| Webhook secret | 임의의 긴 문자열 (`openssl rand -hex 32`) |
| Repository permissions | **Contents: Read-only**, Metadata: Read-only (기본). 규칙 파일 PR·PR 가드를 쓰려면 docs/deploy.md '2-1' 의 쓰기 권한과 이벤트를 추가 |
| Where can this GitHub App be installed? | 개발 중에는 Only on this account |

‘설치 중 사용자 인증’이 꺼져 있으면 설치 콜백에 `code`가 오지 않아 연결이 거절됩니다. 레고는 이 `code`로 설치한 사람이 로그인한 사람과 같은지 확인합니다.

`installation`, `installation_repositories` 이벤트는 GitHub App에 자동으로 전달되므로 따로 구독하지 않아도 됩니다.

만든 뒤 App 설정 페이지에서 확인할 값:

- App ID
- Client ID, **Generate a new client secret**
- **Generate a private key** → `.pem` 파일 다운로드
- slug: `https://github.com/apps/<slug>`의 `<slug>`

## 3. `.env.local`

`.env.example`을 복사해서 채웁니다.

```bash
cp .env.example .env.local
```

private key는 한 줄로 넣습니다 (`\n`은 코드에서 줄바꿈으로 바뀝니다).

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ~/Downloads/lego-dev.*.private-key.pem
```

## 4. 확인

```bash
pnpm dev
```

1. http://localhost:3000/login → GitHub로 계속하기 → `/projects`
2. 리포 연결 → GitHub App 설치하기 → 리포 선택 → `/projects/new?notice=installed`
3. 리포 등록 → `/projects`에 리포와 감지된 스택이 보임
