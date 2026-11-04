import { describe, expect, it } from "vitest";
import { computeTrend, type TrendFinding } from "./trend";

const f = (
  scanId: string,
  fingerprint: string,
  extra: Partial<TrendFinding> = {},
): TrendFinding => ({
  scanId,
  fingerprint,
  severity: "high",
  aiVerdict: "true_positive",
  status: "open",
  ...extra,
});

describe("프로젝트 보안 추이", () => {
  const scans = [
    { id: "s2", createdAt: "2026-11-03T00:00:00Z" },
    { id: "s1", createdAt: "2026-11-01T00:00:00Z" },
    { id: "s3", createdAt: "2026-11-05T00:00:00Z" },
  ];

  it("점검마다 남은·새로 생김·해결을 세고, 오탐·무시는 빼며, 해결 시간 중앙값을 낸다", () => {
    const trend = computeTrend(scans, [
      f("s1", "a"),
      f("s1", "b", { severity: "low" }),
      f("s1", "x", { aiVerdict: "false_positive" }),
      f("s2", "b", { severity: "low" }),
      f("s2", "c"),
      f("s2", "y", { status: "ignored" }),
      f("s3", "c"),
    ]);
    expect(
      trend.points.map((p) => [p.scanId, p.open, p.serious, p.added, p.fixed]),
    ).toEqual([
      ["s1", 2, 1, 0, 0],
      ["s2", 2, 1, 1, 1],
      ["s3", 1, 1, 0, 1],
    ]);
    // a: 11/1 → 11/3 (2일), b: 11/1 → 11/5 (4일) → 중앙값 3일
    expect(trend.fixedTotal).toBe(2);
    expect(trend.medianDaysToFix).toBe(3);
  });

  it("점검이 없으면 빈 추이", () => {
    expect(computeTrend([], [])).toEqual({
      points: [],
      medianDaysToFix: null,
      fixedTotal: 0,
    });
  });
});
