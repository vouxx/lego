import "server-only";
import { z } from "zod";
import { computeTrend } from "@/features/scans/services/trend";
import { reportError } from "@/lib/monitoring";
import {
  claimWeeklyDigest,
  listDueWeeklyDigests,
  listWeeklyFindings,
  listWeeklyLiveChecks,
  listWeeklyPrReviews,
  listWeeklyScans,
} from "../repository";
import { notifyWeekly } from "./notify";
import {
  isQuietWeek,
  previousWeek,
  summarizeWeek,
  weekStartOf,
} from "./weekly-summary";

type TrendSeverity = Parameters<typeof computeTrend>[1][number]["severity"];

const reviewSummary = z.object({ conclusion: z.string().optional() }).catch({});
const checkResults = z
  .object({ isNew: z.boolean().optional() })
  .array()
  .catch([]);

async function buildSummary(projectId: string, from: Date, to: Date) {
  const since = from.toISOString();
  const [{ data: scans }, { data: reviews }, { data: checks }] =
    await Promise.all([
      listWeeklyScans(projectId),
      listWeeklyPrReviews(projectId, since),
      listWeeklyLiveChecks(projectId, since),
    ]);
  const { data: findings } = scans?.length
    ? await listWeeklyFindings(scans.map((s) => s.id))
    : { data: [] };
  const trend = computeTrend(
    (scans ?? []).map((s) => ({ id: s.id, createdAt: s.created_at })),
    (findings ?? []).map((f) => ({
      scanId: f.scan_id,
      fingerprint: f.fingerprint,
      severity: f.severity as TrendSeverity,
      aiVerdict: f.ai_verdict,
      status: f.status,
    })),
  );
  return summarizeWeek({
    points: trend.points,
    reviews: (reviews ?? []).map((r) => ({
      prNumber: r.pr_number,
      conclusion: reviewSummary.parse(r.summary).conclusion,
    })),
    checks: (checks ?? []).map((c) => ({
      results: checkResults.parse(c.results),
    })),
    from,
    to,
  });
}

/**
 * 워커가 부른다. 이번 주 요약을 아직 안 받은 연결에 지난주(월~일) 요약을 보낸다.
 * 먼저 차지하고 보내므로 전송이 실패해도 그 주는 다시 보내지 않고 last_error 에만 남는다.
 */
export async function runWeeklyDigests(limit = 10) {
  const weekStart = weekStartOf(new Date());
  const { data } = await listDueWeeklyDigests(limit, weekStart.toISOString());
  let sent = 0;
  for (const { project_id: projectId } of data ?? []) {
    try {
      const { data: claimed } = await claimWeeklyDigest(
        projectId,
        weekStart.toISOString(),
      );
      if (!claimed) continue;
      const summary = await buildSummary(
        projectId,
        previousWeek(weekStart),
        weekStart,
      );
      if (isQuietWeek(summary)) continue;
      await notifyWeekly(projectId, summary);
      sent++;
    } catch (e) {
      reportError(e, { area: "slack.weekly", extra: { projectId } });
    }
  }
  return { sent };
}
