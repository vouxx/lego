import { NextResponse } from "next/server";
import { isQueueHealthy } from "@/features/scans/services/worker";

/**
 * 가동 감시용. 워커가 멈추면 점검이 큐에 쌓이므로 그것까지 본다.
 * 공개 주소라 숫자나 원인은 돌려주지 않고 상태만 알린다.
 */
export async function GET() {
  const healthy = await isQueueHealthy();
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded" },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
