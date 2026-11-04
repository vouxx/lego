import { describe, expect, it } from "vitest";
import { esc, guardMessage, liveMessage, scanMessage } from "./messages";

const json = (m: unknown) => JSON.stringify(m);

describe("Slack 메시지", () => {
  it("사용자 값의 <, >, & 를 바꿔 링크·멘션으로 해석되지 않게 한다", () => {
    expect(esc("<!channel> a&b")).toBe("&lt;!channel&gt; a&amp;b");
    const m = guardMessage({
      repo: "me/app",
      prNumber: 3,
      prTitle: "<!here> 결제",
      prUrl: "https://github.com/me/app/pull/3",
      title: "남은 문제 2개",
      added: [],
      url: null,
    });
    expect(json(m)).toContain("&lt;!here&gt; 결제");
    expect(json(m)).not.toContain("<!here>");
    expect(json(m)).not.toContain('"actions"');
  });

  it("운영 점검은 새로 생긴 것만 5개까지 보여 주고 나머지는 개수로", () => {
    const added = Array.from({ length: 7 }, (_, i) => ({
      severity: "high" as const,
      title: `문제 ${i}`,
      target: `t${i}`,
    }));
    const m = liveMessage({
      repo: "me/app",
      site: "https://app.example.com",
      added,
      total: 9,
      url: "https://lego/x",
    });
    expect(m.text).toBe("[레고] me/app 운영 점검: 새 문제 7개");
    expect(json(m)).toContain("문제 4");
    expect(json(m)).not.toContain("문제 5");
    expect(json(m)).toContain("…외 2개");
    expect(json(m)).toContain("레고에서 보기");
  });

  it("보안 점검 요약은 있는 심각도만 적는다", () => {
    const m = scanMessage({
      repo: "me/app",
      counts: { critical: 1, low: 2 },
      total: 3,
      url: null,
    });
    expect(json(m)).toContain("치명적 1");
    expect(json(m)).toContain("낮음 2");
    expect(json(m)).not.toContain("높음");
  });
});
