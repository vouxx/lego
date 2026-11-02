import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("사이트 안의 경로는 그대로 쓴다", () => {
    expect(safeNextPath("/projects/new")).toBe("/projects/new");
  });

  it.each([null, "", "https://evil.com", "//evil.com", "/\\evil.com"])(
    "%s 는 기본 경로로 바꾼다",
    (next) => {
      expect(safeNextPath(next)).toBe("/projects");
    },
  );
});
