import "server-only";
import { randomBytes } from "node:crypto";
import type { CurrentUser } from "@/lib/auth";
import {
  authorizeUrl,
  exchangeCode,
  postWebhook,
  slackConfigured,
} from "@/lib/slack/client";
import { createClient } from "@/lib/supabase/server";
import { err, ok, type Result } from "@/shared/lib/result";
import { upsertSlackConnection } from "../repository";
import { testMessage } from "./messages";

export const STATE_COOKIE = "lego_slack_oauth";

async function myProject(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, repo_full_name")
    .eq("id", projectId)
    .maybeSingle();
  return data;
}

/** "Slack 에 추가": 본인 프로젝트인지 확인하고, 되돌아올 때 맞춰 볼 state 를 만든다. */
export async function startSlackConnect(
  projectId: string,
  redirectUri: string,
): Promise<Result<{ url: string; cookie: string }>> {
  if (!slackConfigured())
    return err("not_configured", "Slack 연결이 아직 설정되지 않았습니다.");
  if (!(await myProject(projectId)))
    return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const state = randomBytes(24).toString("base64url");
  return ok({
    url: authorizeUrl(state, redirectUri),
    cookie: `${state}.${projectId}`,
  });
}

/** Slack 에서 돌아왔을 때: state 를 맞춰 보고 채널 webhook 을 저장한 뒤 확인 메시지를 보낸다. */
export async function finishSlackConnect(params: {
  user: CurrentUser;
  code: string;
  state: string;
  cookie: string | undefined;
  redirectUri: string;
}): Promise<Result<{ projectId: string }>> {
  const [expected, projectId] = (params.cookie ?? "").split(".");
  if (!expected || !projectId || expected !== params.state)
    return err("invalid_state", "연결 요청이 만료됐습니다. 다시 눌러 주세요.");
  const project = await myProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");

  let hook;
  try {
    hook = await exchangeCode(params.code, params.redirectUri);
  } catch (e) {
    return err(
      "slack_failed",
      e instanceof Error ? e.message : "Slack 연결에 실패했습니다.",
    );
  }
  const { error } = await upsertSlackConnection({
    project_id: projectId,
    user_id: params.user.id,
    team_id: hook.teamId,
    team_name: hook.teamName,
    channel_id: hook.channelId,
    channel_name: hook.channelName,
    webhook_url: hook.url,
    last_error: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return err("db_error", error.message);
  await postWebhook(hook.url, testMessage(project.repo_full_name)).catch(
    () => {},
  );
  return ok({ projectId });
}
