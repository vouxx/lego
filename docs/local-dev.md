# 로컬 개발

로컬은 Docker 로 띄운 Supabase 를 쓴다. 공유 Supabase 프로젝트(`kqspyogrfebnlitqchvd`)는 **운영 전용**이다.

| | 로컬 | 운영 |
|---|---|---|
| DB | `supabase start` (127.0.0.1:54321) | 공유 프로젝트의 `lego` 스키마 |
| GitHub 로그인 | OAuth App `lego-local` (콜백 `http://127.0.0.1:54321/auth/v1/callback`) | 공유 프로젝트의 GitHub provider |
| GitHub App | `lego-dev-vouxx` (localhost 콜백) | `lego-security` |
| 마이그레이션 | `supabase start` / `supabase db reset` 이 자동 적용 | `pnpm db:migrate` |
| 환경 변수 | `.env.local`, `supabase/.env` | Vercel Production |

## 처음 한 번

1. Docker Desktop 을 켠다.
2. GitHub → Settings → Developer settings → [OAuth Apps → New](https://github.com/settings/applications/new):
   - Homepage URL `http://localhost:3000`
   - Callback URL `http://127.0.0.1:54321/auth/v1/callback`
3. `supabase/.env` (git 제외)에 값을 넣는다.

   ```
   SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=
   SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=
   ```

4. `npx supabase start` 를 실행한다. 마이그레이션이 적용되고, 규칙 22개가 시드된다.
5. `npx supabase status -o env` 의 `API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY` 를 `.env.local` 에 넣는다.
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
6. `pnpm dev` 를 실행하고 로그인한다. 프로젝트 화면에서 개발용 App 을 연결한다.

## 자주 쓰는 명령

```bash
npx supabase start            # 로컬 DB 켜기
npx supabase stop             # 끄기 (데이터 유지)
npx supabase db reset         # 로컬 DB 를 마이그레이션부터 다시 만들기
pnpm db:migrate               # 운영 DB 에 새 마이그레이션 적용 (주의)
```

- `supabase/.env` 나 `config.toml` 을 바꾸면 `npx supabase stop && npx supabase start` 로 컨테이너를 다시 만들어야 반영된다(데이터는 유지). 그냥 `start` 만 하면 예전 값이 남는다.
- 로컬 Studio 는 http://127.0.0.1:54323 이다.
- 로컬 스캔은 `after()` 로 바로 처리된다. pg_cron 작업도 있지만, Vault 에 URL 이 없어서 아무것도 호출하지 않는다.
- 공유 DB 에 접속하던 예전 `.env.local` 값은 `.env.shared.local` 에 백업되어 있다(git 제외).

## 로그인이 필요한 E2E (GitHub 없이)

로컬 Supabase 에만 테스트 사용자(`e2e@lego.test`)와 공개 리포 프로젝트(`vouxx/ZEEK`)를 만들고 세션을 저장한다.
비밀번호는 매번 새로 만들어 바로 로그인하고 어디에도 저장하지 않는다. 원격 DB 를 가리키면 실행을 멈춘다.

```bash
pnpm e2e:local-seed
pnpm e2e --project=local-signed-in
```

- 컨텍스트 생성 흐름(`tests/e2e/context-flow.spec.ts`)은 폴더 요약에 Haiku 를 한 번 부른다(약 $0.001).
- 시드할 때마다 테스트 사용자의 프로젝트를 지우고 새로 만든다.
