import { describe, expect, it } from "vitest";
import { scrubUrl } from "./sentry";

describe("scrubUrl", () => {
  it("초대 토큰을 가린다", () => {
    expect(scrubUrl("https://a.app/invites/abc123?x=1")).toBe(
      "https://a.app/invites/[가림]?x=1",
    );
    expect(scrubUrl("/login?next=%2Finvites%2Fabc123")).not.toContain("abc123");
  });
  it("Slack 웹훅 주소를 가린다", () => {
    expect(scrubUrl("https://hooks.slack.com/services/T0/B0/secret")).toBe(
      "https://hooks.slack.com/services/[가림]",
    );
  });
});
