import { describe, expect, it } from "vitest";
import type { TaskOutline } from "../schemas";
import {
  findCycle,
  isLocked,
  normalizeTaskGraph,
  taskKeysInMessage,
} from "./task-graph";

const task = (key: string, dependsOn: string[] = []): TaskOutline => ({
  key,
  title: key,
  description: "",
  acceptanceCriteria: [],
  dependsOn,
});

describe("normalizeTaskGraph", () => {
  it("키를 순서대로 다시 매기고 선행 작업도 따라 바꾼다", () => {
    const result = normalizeTaskGraph([
      task("setup"),
      task("db", ["setup"]),
      task("auth", ["setup"]),
      task("ui", ["db", "auth", "db"]),
      task("deploy", ["ui"]),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tasks.map((t) => [t.key, t.dependsOn])).toEqual([
      ["T-1", []],
      ["T-2", ["T-1"]],
      ["T-3", ["T-1"]],
      ["T-4", ["T-2", "T-3"]],
      ["T-5", ["T-4"]],
    ]);
  });

  it("없는 선행 작업이면 오류", () => {
    const result = normalizeTaskGraph([
      task("a"),
      task("b", ["zzz"]),
      task("c"),
      task("d"),
      task("e"),
    ]);
    expect(result).toEqual({
      ok: false,
      error: "b 의 선행 작업 zzz 가 목록에 없습니다.",
    });
  });

  it("순환 의존이면 오류", () => {
    const result = normalizeTaskGraph([
      task("a", ["c"]),
      task("b", ["a"]),
      task("c", ["b"]),
      task("d"),
      task("e"),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/순환 의존/);
  });

  it("작업 수가 너무 적으면 오류", () => {
    expect(normalizeTaskGraph([task("a")]).ok).toBe(false);
  });

  it("키 중복이면 오류", () => {
    const result = normalizeTaskGraph([
      task("a"),
      task("a"),
      task("c"),
      task("d"),
      task("e"),
    ]);
    expect(result).toEqual({ ok: false, error: "작업 키 a 가 중복됩니다." });
  });
});

describe("findCycle", () => {
  it("순환 경로를 돌려준다", () => {
    expect(
      findCycle([
        { key: "T-1", dependsOn: ["T-2"] },
        { key: "T-2", dependsOn: ["T-1"] },
      ]),
    ).toEqual(["T-1", "T-2", "T-1"]);
  });

  it("순환이 없으면 null", () => {
    expect(
      findCycle([
        { key: "T-1", dependsOn: [] },
        { key: "T-2", dependsOn: ["T-1"] },
      ]),
    ).toBeNull();
  });
});

describe("isLocked", () => {
  it("선행 작업이 끝나지 않으면 잠긴다", () => {
    const status = new Map([
      ["T-1", "done" as const],
      ["T-2", "doing" as const],
    ]);
    expect(isLocked({ dependsOn: ["T-1"] }, status)).toBe(false);
    expect(isLocked({ dependsOn: ["T-1", "T-2"] }, status)).toBe(true);
  });
});

describe("taskKeysInMessage", () => {
  it("커밋 메시지에서 작업 키를 뽑는다", () => {
    expect(
      taskKeysInMessage("feat: 로그인 [T-3] 과 [T-12], 다시 [T-3]"),
    ).toEqual(["T-3", "T-12"]);
    expect(taskKeysInMessage("T-3 만 쓰면 무시")).toEqual([]);
  });
});
