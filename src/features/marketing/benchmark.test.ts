import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BENCHMARK_RULES, BENCHMARK_SUMMARY } from "./benchmark";

// 랜딩의 탐지율 수치가 측정 결과 문서와 어긋나지 않게 지킨다.
const results = readFileSync(
  join(process.cwd(), "packages/scanner/benchmark/RESULTS.md"),
  "utf8",
);

describe("랜딩 탐지율 수치", () => {
  it("규칙별 탐지·놓침이 RESULTS.md 와 같다", () => {
    const rows = [
      ...results.matchAll(/^\| (SEC-\d{3}) +\| (\d+) +\| (\d+) +\|/gm),
    ].map((m) => ({ id: m[1], hit: Number(m[2]), miss: Number(m[3]) }));
    expect(rows).toHaveLength(22);
    for (const row of rows) {
      const rule = BENCHMARK_RULES.find((r) => r.id === row.id);
      expect(rule, row.id).toBeDefined();
      expect({ hit: rule?.hit, miss: rule?.miss }, row.id).toEqual({
        hit: row.hit,
        miss: row.miss,
      });
    }
    expect(BENCHMARK_RULES).toHaveLength(22);
  });

  it("요약 수치가 규칙별 합계·문서와 같다", () => {
    const found = BENCHMARK_RULES.reduce((n, r) => n + r.hit, 0);
    const missed = BENCHMARK_RULES.reduce((n, r) => n + r.miss, 0);
    expect(found).toBe(BENCHMARK_SUMMARY.found);
    expect(missed).toBe(BENCHMARK_SUMMARY.missed);
    expect(found + missed).toBe(BENCHMARK_SUMMARY.planted);
    expect(results).toContain(`샘플 ${BENCHMARK_SUMMARY.samples}개`);
    expect(results).toContain(
      `**정밀도(precision)**: ${BENCHMARK_SUMMARY.precision} — 오탐 ${BENCHMARK_SUMMARY.falsePositives}개`,
    );
  });
});
