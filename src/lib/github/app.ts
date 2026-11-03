import "server-only";
import { App } from "@octokit/app";
import { exchangeWebFlowCode } from "@octokit/oauth-methods";
import { Octokit } from "@octokit/rest";
import { serverEnv } from "@/lib/env.server";

function createApp() {
  const env = serverEnv();
  return new App({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    Octokit,
  });
}

let app: ReturnType<typeof createApp> | undefined;

function githubApp() {
  app ??= createApp();
  return app;
}

/** 설치 토큰으로 인증된 클라이언트. 해당 설치가 허용한 리포만 읽을 수 있다. */
export function installationOctokit(installationId: number) {
  return githubApp().getInstallationOctokit(installationId);
}

/** 설치 중 사용자 인증으로 받은 code 를 사용자 토큰으로 바꾼다. */
export async function userOctokitFromCode(code: string) {
  const env = serverEnv();
  const { authentication } = await exchangeWebFlowCode({
    clientType: "github-app",
    clientId: env.GITHUB_APP_CLIENT_ID,
    clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    code,
  });
  return new Octokit({ auth: authentication.token });
}

export function githubAppInstallUrl() {
  return `https://github.com/apps/${serverEnv().GITHUB_APP_SLUG}/installations/new`;
}

/**
 * 이미 설치한 App 을 다시 연결할 때 쓰는 사용자 인증 주소.
 * GitHub 는 새로 설치할 때만 콜백으로 돌려보내므로, 기존 설치는 이 인증으로 찾아 연결한다.
 * redirect_uri 를 생략하면 App 에 등록된 첫 Callback URL(설치 콜백)로 돌아온다.
 */
export function githubAppAuthorizeUrl() {
  return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(serverEnv().GITHUB_APP_CLIENT_ID)}`;
}

export function githubWebhookSecret() {
  return serverEnv().GITHUB_WEBHOOK_SECRET;
}
