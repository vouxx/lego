import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { conclusionOf, shouldComment, checkOutput } =
  await import("./pr-guard-publish");

describe("PR 가드 엄격도", () => {
  it("엄격도에 따라 체크 결론이 달라진다", () => {
    expect(conclusionOf({ medium: 1 }, "strict")).toBe("failure");
    expect(conclusionOf({ medium: 1 }, "normal")).toBe("neutral");
    expect(conclusionOf({ high: 1 }, "normal")).toBe("failure");
    expect(conclusionOf({ high: 1 }, "relaxed")).toBe("neutral");
    expect(conclusionOf({ critical: 1 }, "relaxed")).toBe("failure");
    expect(conclusionOf({}, "strict")).toBe("success");
  });

  it("느슨하면 low 는 줄 코멘트를 달지 않는다", () => {
    expect(shouldComment("low", "relaxed")).toBe(false);
    expect(shouldComment("medium", "relaxed")).toBe(true);
    expect(shouldComment("low", "normal")).toBe(true);
    expect(shouldComment("low", "strict")).toBe(true);
  });

  it("상태 체크 요약에 엄격도를 적는다", () => {
    const out = checkOutput({
      findings: [],
      resolved: [],
      risk: [],
      hasScope: false,
      strictness: "relaxed",
    });
    expect(out.conclusion).toBe("success");
    expect(out.summary).toContain("엄격도 느슨");
  });
});
