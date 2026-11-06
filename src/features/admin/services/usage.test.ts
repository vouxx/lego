import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../repository", () => ({}));
const { summarizeCosts } = await import("./usage");

const row = (login: string, purpose: string, cost: string) => ({
  purpose,
  cost_usd: cost as unknown as number,
  profiles: { github_login: login },
});

describe("summarizeCosts", () => {
  it("사용자별·목적별로 모아 많이 쓴 순서로 돌려준다", () => {
    const out = summarizeCosts([
      row("a", "triage", "0.10"),
      row("b", "explain", "0.50"),
      row("a", "explain", "0.05"),
    ]);
    expect(out.totalUsd).toBeCloseTo(0.65);
    expect(out.users.map((u) => u.login)).toEqual(["b", "a"]);
    expect(out.users[1]).toMatchObject({ calls: 2 });
    expect(out.purposes[0]).toMatchObject({ purpose: "explain" });
  });

  it("사용자가 지워진 호출도 합계에 넣는다", () => {
    const out = summarizeCosts([
      { purpose: "triage", cost_usd: 1, profiles: null },
    ]);
    expect(out.users[0]?.login).toBe("(알 수 없음)");
  });
});
