import "server-only";
import { postWebhook, type SlackMessage } from "@/lib/slack/client";
import { reportError } from "@/lib/monitoring";
import { getSlackConnectionForWorker, setSlackError } from "../repository";
import type { NotifyKind } from "../schemas";
import {
  guardMessage,
  liveMessage,
  scanMessage,
  weeklyMessage,
} from "./messages";
import type { WeeklySummary } from "./weekly-summary";

/**
 * 점검이 끝난 뒤 부른다. 연결이 없거나 그 종류를 껐으면 아무것도 안 한다.
 * 알림 실패가 점검 결과 저장을 막지 않도록 여기서 오류를 삼키고 연결에 마지막 오류만 남긴다.
 */
async function send(
  projectId: string,
  kind: NotifyKind,
  build: (repo: string) => SlackMessage,
) {
  try {
    const { data: conn } = await getSlackConnectionForWorker(projectId);
    if (!conn) return;
    const enabled = {
      live: conn.notify_live,
      guard: conn.notify_guard,
      scan: conn.notify_scan,
      weekly: conn.notify_weekly,
    }[kind];
    if (!enabled) return;
    await postWebhook(
      conn.webhook_url,
      build(conn.projects?.repo_full_name ?? ""),
    );
    await setSlackError(projectId, null);
  } catch (e) {
    reportError(e, { area: "slack.notify", extra: { projectId, kind } });
    await setSlackError(
      projectId,
      e instanceof Error ? e.message.slice(0, 200) : "Slack 전송 실패",
    ).catch(() => {});
  }
}

const site = () =>
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null;
const link = (path: string) => {
  const base = site();
  return base ? `${base}${path}` : null;
};

type Severity = "critical" | "high" | "medium" | "low";

export function notifyLiveCheck(params: {
  projectId: string;
  siteUrl: string;
  results: {
    severity: Severity;
    title: string;
    target: string;
    isNew: boolean;
  }[];
}) {
  const added = params.results.filter((r) => r.isNew);
  if (added.length === 0) return Promise.resolve();
  return send(params.projectId, "live", (repo) =>
    liveMessage({
      repo,
      site: params.siteUrl,
      added,
      total: params.results.length,
      url: link(`/projects/${params.projectId}/live`),
    }),
  );
}

export function notifyPrGuard(params: {
  projectId: string;
  reviewId: string;
  prNumber: number;
  prTitle: string;
  prUrl: string | null;
  title: string;
  added: { severity: Severity; title: string; where: string }[];
}) {
  return send(params.projectId, "guard", (repo) =>
    guardMessage({
      ...params,
      repo,
      url: link(`/projects/${params.projectId}/reviews/${params.reviewId}`),
    }),
  );
}

export function notifyScan(params: {
  projectId: string;
  scanId: string;
  counts: Partial<Record<Severity, number>>;
  total: number;
}) {
  return send(params.projectId, "scan", (repo) =>
    scanMessage({
      repo,
      counts: params.counts,
      total: params.total,
      url: link(`/projects/${params.projectId}/scans/${params.scanId}`),
    }),
  );
}

export function notifyWeekly(projectId: string, summary: WeeklySummary) {
  return send(projectId, "weekly", (repo) =>
    weeklyMessage({ repo, summary, url: link(`/projects/${projectId}`) }),
  );
}
