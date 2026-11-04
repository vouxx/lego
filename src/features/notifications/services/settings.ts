import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { postWebhook, slackConfigured } from "@/lib/slack/client";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  deleteSlackConnection,
  getMySlackConnection,
  getSlackConnectionForWorker,
  setSlackError,
  updateSlackConnection,
} from "../repository";
import type { NotifyKind, SlackConnectionView } from "../schemas";
import { testMessage } from "./messages";

/** 프로젝트 화면: Slack 연결 상태(webhook 주소는 보여 주지 않는다) */
export async function getSlackState(projectId: string): Promise<{
  configured: boolean;
  connection: SlackConnectionView | null;
}> {
  const { data } = await getMySlackConnection(projectId);
  return {
    configured: slackConfigured(),
    connection: data
      ? {
          teamName: data.team_name,
          channelName: data.channel_name,
          notify: {
            live: data.notify_live,
            guard: data.notify_guard,
            scan: data.notify_scan,
          },
          lastError: data.last_error,
        }
      : null,
  };
}

const COLUMN = {
  live: "notify_live",
  guard: "notify_guard",
  scan: "notify_scan",
} as const;

export async function changeNotify(
  user: CurrentUser,
  projectId: string,
  kind: NotifyKind,
  enabled: boolean,
): Promise<Result<null>> {
  const { data, error } = await updateSlackConnection(projectId, user.id, {
    [COLUMN[kind]]: enabled,
  });
  if (error) return err("db_error", error.message);
  return data ? ok(null) : err("not_found", "Slack 연결이 없습니다.");
}

export async function disconnectSlack(
  user: CurrentUser,
  projectId: string,
): Promise<Result<null>> {
  const { error } = await deleteSlackConnection(projectId, user.id);
  return error ? err("db_error", error.message) : ok(null);
}

export async function sendSlackTest(
  user: CurrentUser,
  projectId: string,
): Promise<Result<null>> {
  const { data: conn } = await getSlackConnectionForWorker(projectId);
  if (!conn || conn.user_id !== user.id)
    return err("not_found", "Slack 연결이 없습니다.");
  try {
    await postWebhook(
      conn.webhook_url,
      testMessage(conn.projects?.repo_full_name ?? ""),
    );
    await setSlackError(projectId, null);
    return ok(null);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Slack 전송 실패";
    await setSlackError(projectId, message.slice(0, 200));
    return err("slack_failed", message);
  }
}
