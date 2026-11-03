import { describe, expect, it } from "vitest";
import { pushAffectsContext, pushEventSchema } from "./outdated";
import { selectPacks } from "./packs";

describe("selectPacks", () => {
  const packs = [
    { slug: "common", detect: { always: true } },
    { slug: "supabase", detect: { tags: ["supabase"] } },
    { slug: "testing", detect: { tags: ["vitest", "jest"] } },
    { slug: "broken", detect: "nope" },
  ];

  it("항상 적용 팩과 태그가 맞는 팩만 고른다", () => {
    expect(selectPacks(packs, ["jest"]).map((p) => p.slug)).toEqual([
      "common",
      "testing",
    ]);
  });
});

describe("pushAffectsContext", () => {
  const event = (
    commits: { added?: string[]; removed?: string[]; modified?: string[] }[],
    ref = "refs/heads/main",
  ) =>
    pushEventSchema.parse({
      ref,
      repository: { full_name: "a/b", default_branch: "main" },
      commits,
    });
  const root = ["package.json", "src", "README.md"];

  it("package.json 이 바뀌면 true", () => {
    expect(
      pushAffectsContext(event([{ modified: ["package.json"] }]), root),
    ).toBe(true);
  });

  it("새 최상위 폴더가 생기면 true", () => {
    expect(
      pushAffectsContext(event([{ added: ["supabase/a.sql"] }]), root),
    ).toBe(true);
  });

  it("기존 폴더 안의 파일 변경은 false", () => {
    expect(
      pushAffectsContext(
        event([{ added: ["src/new.ts"], modified: ["src/a.ts"] }]),
        root,
      ),
    ).toBe(false);
  });

  it("기본 브랜치가 아니면 false", () => {
    expect(
      pushAffectsContext(
        event([{ modified: ["package.json"] }], "refs/heads/feature"),
        root,
      ),
    ).toBe(false);
  });
});
