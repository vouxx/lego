import "server-only";
import {
  ackScanJob,
  archiveScanJob,
  readScanJobs,
  updateScan,
} from "../repository";
import { processScan } from "./process-scan";

const VISIBILITY_SECONDS = 600; // 처리 중인 작업을 다른 워커가 가져가지 않는 시간
const MAX_ATTEMPTS = 3;

/**
 * 큐에서 스캔 작업을 꺼내 처리한다. 실패한 작업은 큐에 남아 VISIBILITY_SECONDS 뒤 다시 보이고,
 * MAX_ATTEMPTS 번 실패하면 스캔을 failed 로 기록하고 작업을 보관함으로 옮긴다.
 */
export async function runScanWorker({ maxJobs = 3 } = {}) {
  const { data: jobs, error } = await readScanJobs(maxJobs, VISIBILITY_SECONDS);
  if (error) throw new Error(`스캔 큐 읽기 실패: ${error.message}`);

  let processed = 0;
  for (const job of jobs ?? []) {
    try {
      await processScan(job.scan_id);
      await ackScanJob(job.msg_id);
      processed++;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
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
  return { processed, picked: jobs?.length ?? 0 };
}
