import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runScanWorker } from "@/features/scans/services/worker";
import { serverEnv } from "@/lib/env.server";

// 배포 후 pg_cron(pg_net) 이 매분 호출한다. Authorization: Bearer <SCAN_WORKER_SECRET>
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
  try {
    return NextResponse.json(await runScanWorker());
  } catch (error) {
    console.error("[scan-worker]", error);
    return NextResponse.json({ error: "worker_failed" }, { status: 500 });
  }
}
