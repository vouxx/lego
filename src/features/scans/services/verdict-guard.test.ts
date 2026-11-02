import { describe, expect, it } from "vitest";
import { guardVerdict } from "./verdict-guard";

describe("guardVerdict", () => {
  it("일반 파일의 하드코딩 키는 AI 가 오탐이라 해도 숨기지 않는다", () => {
    expect(
      guardVerdict(
        { ruleId: "SEC-001", filePath: "src/lib/ai.ts" },
        "false_positive",
      ),
    ).toBe("uncertain");
  });

  it("테스트 파일의 키는 오탐 판정을 그대로 둔다", () => {
    for (const filePath of [
      "src/__tests__/fixtures.ts",
      "tests/keys.ts",
      "src/lib/ai.test.ts",
    ]) {
      expect(
        guardVerdict({ ruleId: "SEC-001", filePath }, "false_positive"),
      ).toBe("false_positive");
    }
  });

  it("문맥에 따라 달라지는 규칙은 AI 판정을 따른다", () => {
    expect(
      guardVerdict(
        { ruleId: "SEC-007", filePath: "src/app/api/posts/route.ts" },
        "false_positive",
      ),
    ).toBe("false_positive");
  });

  it("true_positive 와 uncertain 은 바꾸지 않는다", () => {
    const c = { ruleId: "SEC-001", filePath: "src/lib/ai.ts" };
    expect(guardVerdict(c, "true_positive")).toBe("true_positive");
    expect(guardVerdict(c, "uncertain")).toBe("uncertain");
  });
});
