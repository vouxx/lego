import { describe, expect, it } from "vitest";
import type { SessionMessage } from "../schemas";
import { computeStats, errorSignature } from "./stats";

describe("computeStats", () => {
  it("반복 수정과 반복 오류를 센다", () => {
    const edit = (file: string): SessionMessage => ({
      role: "assistant",
      text: "",
      tools: [{ name: "Edit", target: file }],
    });
    const err = (n: number): SessionMessage => ({
      role: "tool",
      text: `Error: Cannot find module 'x${n}' at line ${n}`,
      isError: true,
    });
    const stats = computeStats(
      [
        { role: "user", text: "고쳐줘", timestamp: "2026-11-03T00:00:00Z" },
        edit("a.ts"),
        edit("a.ts"),
        edit("a.ts"),
        edit("b.ts"),
        err(1),
        err(2),
        { role: "user", text: "또", timestamp: "2026-11-03T00:30:00Z" },
      ],
      2,
    );
    expect(stats.repeatedEdits).toEqual([{ file: "a.ts", count: 3 }]);
    expect(stats.repeatedErrors).toHaveLength(1);
    expect(stats.repeatedErrors[0]!.count).toBe(2);
    expect(stats.toolCalls).toBe(4);
    expect(stats.durationMinutes).toBe(30);
    expect(stats.maskedCount).toBe(2);
  });

  it("오류 서명은 숫자·따옴표 안 값을 무시한다", () => {
    expect(errorSignature("ok\nError: bad 'x' at 12")).toBe(
      "Error: bad … at N",
    );
  });
});
