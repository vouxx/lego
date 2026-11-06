import { describe, expect, it } from "vitest";
import { githubIdentity } from "./identity";

describe("githubIdentity", () => {
  it("GitHub identity 에서 로그인과 id 를 읽는다", () => {
    expect(
      githubIdentity({
        identities: [
          { provider: "email", identity_data: { user_name: "x" } },
          {
            provider: "github",
            identity_data: {
              user_name: "alice",
              provider_id: "42",
              avatar_url: "https://a/b.png",
            },
          },
        ],
      }),
    ).toEqual({ login: "alice", id: 42, avatarUrl: "https://a/b.png" });
  });

  it("사용자가 바꿀 수 있는 user_metadata 는 보지 않는다", () => {
    expect(
      githubIdentity({
        identities: [{ provider: "email", identity_data: {} }],
        user_metadata: { user_name: "victim", provider_id: "1" },
      } as never),
    ).toBeNull();
  });

  it("identity 가 없으면 null", () => {
    expect(githubIdentity({})).toBeNull();
    expect(
      githubIdentity({
        identities: [{ provider: "github", identity_data: { user_name: "a" } }],
      }),
    ).toBeNull();
  });
});
