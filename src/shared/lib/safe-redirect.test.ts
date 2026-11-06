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

describe("safeNextPath 제어 문자", () => {
  it.each(["/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\u0000/evil.com"])(
    "브라우저 URL 파서가 지우는 문자로 빠져나가지 못한다: %j",
    (next) => {
      expect(safeNextPath(next)).toBe("/projects");
    },
  );
  it("쿼리와 해시는 유지한다", () => {
    expect(safeNextPath("/projects/new?a=1#b")).toBe("/projects/new?a=1#b");
  });
});
