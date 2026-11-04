import type { Severity } from "../schemas";

/** 점검마다 남은 문제·새로 생김·해결 수와 해결까지 걸린 시간. 화면 없이 계산만 한다. */

export type TrendScan = { id: string; createdAt: string };
export type TrendFinding = {
  scanId: string;
  fingerprint: string;
  severity: Severity;
  aiVerdict: string | null;
  status: string;
};

export type TrendPoint = {
  scanId: string;
  at: string;
  open: number;
  /** critical·high 만 */
  serious: number;
  added: number;
  fixed: number;
};

export type ProjectTrend = {
  points: TrendPoint[];
  /** 해결된 문제가 처음 보인 점검부터 사라진 점검까지 걸린 시간의 중앙값(일) */
  medianDaysToFix: number | null;
  fixedTotal: number;
};

const DAY = 24 * 60 * 60 * 1000;

/** AI 가 오탐으로 본 것과 사용자가 무시한 것은 '남은 문제'로 세지 않는다. */
const counts = (f: TrendFinding) =>
  f.aiVerdict !== "false_positive" && f.status !== "ignored";

export function computeTrend(
  scans: TrendScan[],
  findings: TrendFinding[],
): ProjectTrend {
  const ordered = [...scans].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const byScan = new Map<string, TrendFinding[]>();
  for (const f of findings.filter(counts)) {
    const list = byScan.get(f.scanId) ?? [];
    list.push(f);
    byScan.set(f.scanId, list);
  }

  const firstSeen = new Map<string, number>();
  const daysToFix: number[] = [];
  let previous: Set<string> | null = null;
  const points: TrendPoint[] = [];
  for (const scan of ordered) {
    const rows = byScan.get(scan.id) ?? [];
    const current = new Set(rows.map((r) => r.fingerprint));
    const at = Date.parse(scan.createdAt);
    for (const fp of current) if (!firstSeen.has(fp)) firstSeen.set(fp, at);
    let added = 0;
    let fixed = 0;
    if (previous) {
      for (const fp of current) if (!previous.has(fp)) added++;
      for (const fp of previous)
        if (!current.has(fp)) {
          fixed++;
          daysToFix.push((at - firstSeen.get(fp)!) / DAY);
          firstSeen.delete(fp);
        }
    }
    points.push({
      scanId: scan.id,
      at: scan.createdAt,
      open: current.size,
      serious: new Set(
        rows
          .filter((r) => r.severity === "critical" || r.severity === "high")
          .map((r) => r.fingerprint),
      ).size,
      added,
      fixed,
    });
    previous = current;
  }

  const sorted = [...daysToFix].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length === 0
      ? null
      : sorted.length % 2
        ? sorted[mid]!
        : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return {
    points,
    medianDaysToFix: median,
    fixedTotal: daysToFix.length,
  };
}
