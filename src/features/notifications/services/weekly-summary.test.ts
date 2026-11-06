import { describe, expect, it } from "vitest";
import {
  isQuietWeek,
  previousWeek,
  summarizeWeek,
  weekStartOf,
} from "./weekly-summary";

const point = (at: string, open: number, added = 0, fixed = 0) => ({
  scanId: at,
  at,
  open,
  serious: 1,
  added,
  fixed,
});

describe("weekStartOf", () => {
  it("월요일 00:00 UTC(09:00 KST) 를 돌려준다", () => {
    // 2026-11-06 은 금요일
    expect(weekStartOf(new Date("2026-11-06T12:00:00Z")).toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
  });

  it("일요일은 그 주 월요일로, 월요일 자정은 그날로 본다", () => {
    expect(weekStartOf(new Date("2026-11-08T23:59:00Z")).toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
    expect(weekStartOf(new Date("2026-11-09T00:00:00Z")).toISOString()).toBe(
      "2026-11-09T00:00:00.000Z",
    );
  });
});

describe("summarizeWeek", () => {
  const to = new Date("2026-11-09T00:00:00Z");
  const from = previousWeek(to);
  const base = { points: [], reviews: [], checks: [], from, to };

  it("주 안의 새 문제·해결만 더하고, 남은 문제는 주가 끝날 때 값을 쓴다", () => {
    const { scan } = summarizeWeek({
      ...base,
      points: [
        point("2026-10-28T00:00:00Z", 5, 9, 9),
        point("2026-11-03T00:00:00Z", 4, 1, 2),
        point("2026-11-07T00:00:00Z", 3, 0, 1),
        point("2026-11-09T01:00:00Z", 8, 5, 0),
      ],
    });
    expect(scan).toEqual({
      total: 3,
      open: 3,
      serious: 1,
      added: 1,
      fixed: 3,
    });
  });

  it("같은 PR 은 마지막 커밋의 결론으로 센다", () => {
    const { pr } = summarizeWeek({
      ...base,
      reviews: [
        { prNumber: 1, conclusion: "failure" },
        { prNumber: 1, conclusion: "success" },
        { prNumber: 2, conclusion: "failure" },
        { prNumber: 3, conclusion: "neutral" },
      ],
    });
    expect(pr).toEqual({ total: 3, passed: 2 });
  });

  it("운영 점검은 새 문제를 더하고 남은 문제는 마지막 점검으로 센다", () => {
    const { live } = summarizeWeek({
      ...base,
      checks: [
        { results: [{ isNew: true }, {}] },
        { results: [{ isNew: true }] },
      ],
    });
    expect(live).toEqual({ checks: 2, added: 2, open: 1 });
  });

  it("아무 일도 없고 남은 문제도 없으면 조용한 주다", () => {
    expect(isQuietWeek(summarizeWeek(base))).toBe(true);
    expect(
      isQuietWeek(
        summarizeWeek({
          ...base,
          points: [point("2026-10-20T00:00:00Z", 2)],
        }),
      ),
    ).toBe(false);
  });
});
