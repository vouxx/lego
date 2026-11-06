import "server-only";
import { reportError } from "@/lib/monitoring";
import {
  ackScanJob,
  archiveScanJob,
  countStuckScans,
  readScanJobs,
  updateScan,
} from "../repository";
import { processScan } from "./process-scan";

const VISIBILITY_SECONDS = 600; // 처리 중인 작업을 다른 워커가 가져가지 않는 시간
const MAX_ATTEMPTS = 3;

/**
 * 큐에서 스캔 작업을 꺼내 처리한다. 실패한 작업은 큐에 남아 VISIBILITY_SECONDS 뒤 다시 보이고,
 * MAX_ATTEMPTS 번 실패하면 스캔을 failed 로 기록하고 작업을 보관함으로 옮긴다.
 *
 * 처리 중 함수가 강제 종료되면 catch 에 닿지 못하므로, 꺼낼 때 시도 횟수를 먼저 본다.
 * 작업은 하나씩 꺼낸다. 한꺼번에 꺼내면 강제 종료될 때 같이 꺼낸 정상 작업의 시도 횟수까지 늘어난다.
 */
export async function runScanWorker({ maxJobs = 3 } = {}) {
  let processed = 0;
  let picked = 0;
  for (; picked < maxJobs; picked++) {
    const { data: jobs, error } = await readScanJobs(1, VISIBILITY_SECONDS);
    if (error) throw new Error(`스캔 큐 읽기 실패: ${error.message}`);
    const job = jobs?.[0];
    if (!job) break;

    if (job.read_ct > MAX_ATTEMPTS) {
      await updateScan(job.scan_id, {
        status: "failed",
        error: "시간 안에 끝내지 못해 점검을 중단했습니다.",
        finished_at: new Date().toISOString(),
      });
      await archiveScanJob(job.msg_id);
      continue;
    }

    try {
      await processScan(job.scan_id);
      await ackScanJob(job.msg_id);
      processed++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      reportError(cause, {
        area: "scan-worker",
        extra: { scanId: job.scan_id, attempt: job.read_ct },
      });
      if (job.read_ct >= MAX_ATTEMPTS) {
        await updateScan(job.scan_id, {
          status: "failed",
          error: message,
          finished_at: new Date().toISOString(),
        });
        await archiveScanJob(job.msg_id);
      } else {
        await updateScan(job.scan_id, {
          status: "queued",
          error: `재시도 대기 중: ${message}`,
        });
      }
    }
  }
  return { processed, picked };
}

/** 가동 감시용: 워커가 멈춰 끝나지 않은 점검이 없는지. */
export async function isQueueHealthy() {
  const { count, error } = await countStuckScans();
  return !error && count === 0;
}
