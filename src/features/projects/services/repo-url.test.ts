import { describe, expect, it } from "vitest";
import { parseRepoInput } from "./repo-url";

describe("parseRepoInput", () => {
  it.each([
    ["vouxx/lego", "vouxx/lego"],
    ["https://github.com/vouxx/lego", "vouxx/lego"],
    ["https://github.com/vouxx/lego.git", "vouxx/lego"],
    ["github.com/vouxx/lego/tree/main/src", "vouxx/lego"],
    ["  https://www.github.com/vouxx/my.app?tab=readme  ", "vouxx/my.app"],
    ["git@github.com:vouxx/lego.git", "vouxx/lego"],
  ])("%s → %s", (input, expected) => {
    expect(parseRepoInput(input)).toBe(expected);
  });

  it.each(["", "lego", "https://gitlab.com/a/b", "vouxx/..", "a/b/c d"])(
    "%s 는 거절한다",
    (input) => {
      expect(parseRepoInput(input)).toBeNull();
    },
  );
});
