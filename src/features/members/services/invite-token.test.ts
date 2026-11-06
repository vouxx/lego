import { describe, expect, it } from "vitest";
import { inviteInput } from "../schemas";
import { hashInviteToken, newInviteToken, sameLogin } from "./invite-token";

describe("초대 토큰", () => {
  it("매번 다른 토큰을 만들고 해시는 원문을 드러내지 않는다", () => {
    const token = newInviteToken();
    expect(token).not.toBe(newInviteToken());
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hashInviteToken(token)).not.toContain(token);
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
  });

  it("GitHub 아이디는 대소문자를 가리지 않는다", () => {
    expect(sameLogin("Vouxx", "vouxx")).toBe(true);
    expect(sameLogin("vouxx", "vouxx2")).toBe(false);
  });
});

describe("초대 입력", () => {
  const projectId = "00000000-0000-4000-8000-000000000000";

  it("앞의 @ 와 공백을 지운다", () => {
    expect(
      inviteInput.parse({ projectId, githubLogin: " @Octo-Cat " }).githubLogin,
    ).toBe("Octo-Cat");
  });

  it.each(["", "a b", "-x", "a/b", "../x", "a".repeat(40)])(
    "%s 는 받지 않는다",
    (githubLogin) => {
      expect(inviteInput.safeParse({ projectId, githubLogin }).success).toBe(
        false,
      );
    },
  );
});
