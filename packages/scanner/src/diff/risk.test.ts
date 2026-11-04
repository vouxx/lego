import { describe, expect, it } from "vitest";
import { riskAreas, taskKeysIn } from "./risk";
import type { ChangedFile } from "./rules";

const f = (
  path: string,
  added: string[] = [],
  status: ChangedFile["status"] = "modified",
): ChangedFile => ({
  path,
  status,
  patch: `@@ -1,0 +1,${added.length} @@\n${added.map((l) => `+${l}`).join("\n")}`,
});

describe("riskAreas", () => {
  it("경로와 바뀐 줄로 위험 영역을 고른다", () => {
    const areas = riskAreas([
      f("src/middleware.ts"),
      f("src/lib/orders.ts", [
        "const { data: { user } } = await supabase.auth.getUser();",
      ]),
      f("supabase/migrations/0009_orders.sql"),
      f("app/api/webhooks/stripe/route.ts"),
      f(".github/workflows/deploy.yml"),
      f("next.config.ts"),
      f("package.json", ['    "zod": "^4.1.0",', '    "version": "1.2.0",']),
      f("README.md"),
    ]);
    expect(areas.map((a) => [a.id, a.files])).toEqual([
      ["auth", ["src/middleware.ts", "src/lib/orders.ts"]],
      ["database", ["supabase/migrations/0009_orders.sql"]],
      ["payment", ["app/api/webhooks/stripe/route.ts"]],
      ["config", ["next.config.ts"]],
      ["ci", [".github/workflows/deploy.yml"]],
      ["dependencies", ["package.json"]],
    ]);
    expect(areas.find((a) => a.id === "dependencies")?.note).toContain("zod");
  });

  it("문서만 바꾼 PR 은 위험 영역이 없고, 큰 PR 은 큰 변경으로 표시한다", () => {
    expect(riskAreas([f("README.md", ["hello"])])).toEqual([]);
    const many = Array.from({ length: 21 }, (_, i) => f(`docs/${i}.md`, ["x"]));
    expect(riskAreas(many).map((a) => a.id)).toEqual(["large"]);
  });
});

describe("taskKeysIn", () => {
  it("[T-3], 브랜치 이름 feat/T-12-login 에서 작업 키를 찾는다", () => {
    expect(
      taskKeysIn([
        "로그인 화면 [T-3]",
        "feat/T-12-login",
        "fix: typo",
        "t-4 소문자",
      ]),
    ).toEqual(["T-3", "T-12", "T-4"]);
    expect(taskKeysIn(["CONTACT-1 같은 건 아님"])).toEqual([]);
  });
});
