import type { TrendPoint } from "@/features/scans/services/trend";

/** 주간 요약의 숫자. 화면·네트워크 없이 계산만 한다(단위 테스트 대상). */

export type WeeklySummary = {
  scan: {
    /** 끝난 점검이 하나라도 있었는지(0 이면 아직 점검 전) */
    total: number;
    open: number;
    serious: number;
    added: number;
    fixed: number;
  };
  pr: { total: number; passed: number };
  live: { checks: number; added: number; open: number };
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** 이번 주가 시작된 때: 월요일 00:00 UTC(09:00 KST) */
export function weekStartOf(now: Date) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

export const previousWeek = (weekStart: Date) =>
  new Date(weekStart.getTime() - WEEK);

type Review = { prNumber: number; conclusion?: string };
type LiveCheck = { results: { isNew?: boolean }[] };

export function summarizeWeek(params: {
  /** 오래된 순. 이번 주에 끝난 점검은 세지 않는다. */
  points: TrendPoint[];
  /** 오래된 순 */
  reviews: Review[];
  /** 오래된 순 */
  checks: LiveCheck[];
  from: Date;
  to: Date;
}): WeeklySummary {
  const inWeek = (at: string) => {
    const time = Date.parse(at);
    return time >= params.from.getTime() && time < params.to.getTime();
  };
  const upToNow = params.points.filter(
    (p) => Date.parse(p.at) < params.to.getTime(),
  );
  const last = upToNow.at(-1);
  const week = upToNow.filter((p) => inWeek(p.at));

  // 같은 PR 의 커밋이 여럿이면 마지막 결론만 본다.
  const latest = new Map(params.reviews.map((r) => [r.prNumber, r.conclusion]));

  return {
    scan: {
      total: upToNow.length,
      open: last?.open ?? 0,
      serious: last?.serious ?? 0,
      added: week.reduce((sum, p) => sum + p.added, 0),
      fixed: week.reduce((sum, p) => sum + p.fixed, 0),
    },
    pr: {
      total: latest.size,
      passed: [...latest.values()].filter((c) => c !== "failure").length,
    },
    live: {
      checks: params.checks.length,
      added: params.checks.reduce(
        (sum, c) => sum + c.results.filter((r) => r.isNew).length,
        0,
      ),
      open: params.checks.at(-1)?.results.length ?? 0,
    },
  };
}

/** 지난주에 아무 일도 없고 남은 문제도 없으면 보내지 않는다. */
export const isQuietWeek = ({ scan, pr, live }: WeeklySummary) =>
  scan.open === 0 &&
  scan.added === 0 &&
  scan.fixed === 0 &&
  pr.total === 0 &&
  live.checks === 0;
