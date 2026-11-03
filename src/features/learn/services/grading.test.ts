import { describe, expect, it } from "vitest";
import {
  gradeQuiz,
  guessLanguage,
  nextMastery,
  sanitizeQuiz,
  sliceLines,
} from "./grading";

const q = (answerIndex: number, options = ["a", "b", "c", "d"]) => ({
  question: "질문",
  options,
  answerIndex,
  explanation: "해설",
});

describe("gradeQuiz", () => {
  it("맞힌 비율을 점수로 돌려준다", () => {
    const result = gradeQuiz([q(0), q(1), q(2)], [0, 1, 3]);
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.results.map((r) => r.correct)).toEqual([true, true, false]);
  });

  it("답하지 않은 문항은 틀린 것", () => {
    expect(gradeQuiz([q(0), q(1)], [0]).score).toBe(0.5);
  });
});

describe("nextMastery", () => {
  it("처음이면 점수 그대로", () => {
    expect(nextMastery(null, 2 / 3)).toBe(67);
  });
  it("이전 값과 섞는다", () => {
    expect(nextMastery(50, 1)).toBe(70);
    expect(nextMastery(100, 0)).toBe(60);
  });
});

describe("sanitizeQuiz", () => {
  it("정답 번호가 범위 밖이거나 보기가 하나인 문항은 버리고 3개까지만", () => {
    const result = sanitizeQuiz([q(5), q(0, ["only"]), q(0), q(1), q(2), q(3)]);
    expect(result).toHaveLength(3);
    expect(result.map((x) => x.answerIndex)).toEqual([0, 1, 2]);
  });
});

describe("guessLanguage / sliceLines", () => {
  it("확장자로 언어를 짐작한다", () => {
    expect(guessLanguage("src/a.tsx")).toBe("tsx");
    expect(guessLanguage("x.sql")).toBe("sql");
    expect(guessLanguage("README")).toBeNull();
    expect(guessLanguage(null)).toBeNull();
  });
  it("줄 범위를 자른다", () => {
    expect(sliceLines("1\n2\n3\n4", 2, 3)).toBe("2\n3");
  });
});
