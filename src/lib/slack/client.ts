import "server-only";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";

/**
 * 사용자용 Slack 알림. "Slack 에 추가"(OAuth v2, incoming-webhook) 로 채널 하나의 webhook 주소를 받고,
 * 알림은 그 주소로 보낸다. 봇 서버나 토큰 저장 없이 고른 채널에 글을 쓰는 것만 한다.
 */

const SLACK_ORIGIN = "https://slack.com";
const HOOK_HOST = "hooks.slack.com";

/** 로컬 E2E 는 모의 서버를 쓴다. 운영에서는 언제나 slack.com. */
function apiOrigin() {
  const env = serverEnv();
  return process.env.NODE_ENV !== "production" && env.SLACK_API_URL
    ? new URL(env.SLACK_API_URL).origin
    : SLACK_ORIGIN;
}

export function slackConfigured() {
  const env = serverEnv();
  return !!env.SLACK_CLIENT_ID && !!env.SLACK_CLIENT_SECRET;
}

export function authorizeUrl(state: string, redirectUri: string) {
  const url = new URL("/oauth/v2/authorize", apiOrigin());
  url.searchParams.set("client_id", serverEnv().SLACK_CLIENT_ID ?? "");
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

const accessResponse = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  team: z.object({ id: z.string(), name: z.string().default("") }).optional(),
  incoming_webhook: z
    .object({
      channel: z.string().default(""),
      channel_id: z.string(),
      url: z.string(),
    })
    .optional(),
});

export type SlackWebhook = {
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
  url: string;
};

/** Slack 이 돌려준 code 를 채널 webhook 으로 바꾼다. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<SlackWebhook> {
  const env = serverEnv();
  const res = await fetch(new URL("/api/oauth.v2.access", apiOrigin()), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID ?? "",
      client_secret: env.SLACK_CLIENT_SECRET ?? "",
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = accessResponse.parse(await res.json());
  if (!data.ok || !data.team || !data.incoming_webhook)
    throw new Error(`Slack 연결 실패: ${data.error ?? "응답 형식이 다릅니다"}`);
  const hook = data.incoming_webhook;
  if (!isWebhookUrl(hook.url))
    throw new Error("Slack 이 준 주소가 이상합니다.");
  return {
    teamId: data.team.id,
    teamName: data.team.name,
    channelId: hook.channel_id,
    channelName: hook.channel.replace(/^#/, ""),
    url: hook.url,
  };
}

/** hooks.slack.com 의 https 주소만 믿는다(운영이 아니면 로컬 E2E 모의 서버도). */
export function isWebhookUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" && url.hostname === HOOK_HOST) return true;
    return (
      process.env.NODE_ENV !== "production" && url.hostname === "localhost"
    );
  } catch {
    return false;
  }
}

export type SlackMessage = { text: string; blocks?: unknown[] };

/** webhook 으로 보낸다. 채널이 지워졌거나 앱이 제거되면 Slack 이 4xx 를 준다. */
export async function postWebhook(url: string, message: SlackMessage) {
  if (!isWebhookUrl(url)) throw new Error("Slack 주소가 올바르지 않습니다.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 100);
    throw new Error(`Slack 전송 실패(${res.status}): ${body}`);
  }
}
