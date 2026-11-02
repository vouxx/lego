import { describe, expect, it } from "vitest";
import { detectByRegex } from "./regex";

describe("detectByRegex", () => {
  it("일치하는 줄의 위치와 내용을 후보로 돌려준다", () => {
    const candidates = detectByRegex(
      [{ path: "src/a.ts", content: "const a = 1;\nconst key = 'secret';\n" }],
      { ruleId: "TEST-001", severity: "low", pattern: /secret/ },
    );

    expect(candidates).toEqual([
      {
        ruleId: "TEST-001",
        severity: "low",
        filePath: "src/a.ts",
        lineStart: 2,
        lineEnd: 2,
        snippet: "const key = 'secret';",
      },
    ]);
  });

  it("include 로 제외한 파일은 검사하지 않는다", () => {
    const candidates = detectByRegex(
      [{ path: "README.md", content: "secret" }],
      {
        ruleId: "TEST-001",
        severity: "low",
        pattern: /secret/,
        include: (path) => path.endsWith(".ts"),
      },
    );

    expect(candidates).toEqual([]);
  });
});
