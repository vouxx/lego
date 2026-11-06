import "server-only";
import { getMyQuota } from "../repository";

const DEFAULT_SCANS = 30;

/** 이번 달 사용량. 이번 달에 아직 쓰지 않았으면 행이 없다. */
export async function getMyUsage() {
  const period = new Date(
    Date.now() + 9 * 3_600_000, // 한도는 한국 시간 달력 기준으로 나뉜다
  )
    .toISOString()
    .slice(0, 7);
  const { data } = await getMyQuota(period);
  const tokensLimit = Number(data?.tokens_limit ?? 0);
  return {
    scansUsed: data?.scans_used ?? 0,
    scansLimit: data?.scans_limit ?? DEFAULT_SCANS,
    tokenPercent:
      tokensLimit > 0
        ? Math.min(
            100,
            Math.round((Number(data?.tokens_used ?? 0) / tokensLimit) * 100),
          )
        : 0,
  };
}
