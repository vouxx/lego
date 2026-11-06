import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { runDueLiveChecks } from "@/features/live/services/live";
import { runWeeklyDigests } from "@/features/notifications/services/weekly";
import { runScanWorker } from "@/features/scans/services/worker";
import { serverEnv } from "@/lib/env.server";
import { reportError } from "@/lib/monitoring";

// pg_cron(pg_net) 이 큐에 작업이 있거나 하루가 지난 운영 점검 대상·보낼 주간 요약이 있을 때 호출한다. Authorization: Bearer <SCAN_WORKER_SECRET>
// 기본은 202 를 바로 돌려주고 after() 로 처리한다(pg_net 연결을 오래 잡지 않도록).
// ?wait=1 이면 끝날 때까지 기다려 결과를 돌려준다(수동 확인용).
export const maxDuration = 300;

function authorized(header: string | null) {
  const secret = serverEnv().SCAN_WORKER_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (request.nextUrl.searchParams.get("wait") === "1") {
    try {
      const scans = await runScanWorker();
      const live = await runDueLiveChecks();
      const weekly = await runWeeklyDigests();
      return NextResponse.json({ ...scans, live, weekly });
    } catch (error) {
      reportError(error, { area: "scan-worker" });
      return NextResponse.json({ error: "worker_failed" }, { status: 500 });
    }
  }
  after(async () => {
    try {
      await runScanWorker();
    } catch (error) {
      reportError(error, { area: "scan-worker" });
    }
    // 하루가 지난 운영 점검 대상(pg_cron 이 대상이 있을 때도 부른다).
    try {
      await runDueLiveChecks();
    } catch (error) {
      reportError(error, { area: "live.daily" });
    }
    try {
      await runWeeklyDigests();
    } catch (error) {
      reportError(error, { area: "slack.weekly" });
    }
  });
  return NextResponse.json({ accepted: true }, { status: 202 });
}
