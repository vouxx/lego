import { describe, expect, it } from "vitest";
import type { SessionMessage } from "../schemas";
import { condenseTranscript } from "./condense";

describe("condenseTranscript", () => {
  it("짧은 세션은 모든 턴을 번호와 함께 남긴다", () => {
    const text = condenseTranscript([
      { role: "user", text: "만들어 줘" },
      {
        role: "assistant",
        text: "네",
        tools: [{ name: "Edit", target: "a.ts" }],
      },
      { role: "tool", text: "Error", isError: true },
    ]);
    expect(text).toBe(
      "[0] 사용자: 만들어 줘\n[1] AI: 네 [도구: Edit(a.ts)]\n[2] 도구 결과(오류): Error",
    );
  });

  it("긴 세션은 6만 자 안쪽으로 줄이고 처음·끝을 지킨다", () => {
    const messages: SessionMessage[] = Array.from(
      { length: 2_000 },
      (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        text: `메시지 ${i} ${"x".repeat(400)}`,
      }),
    );
    const text = condenseTranscript(messages);
    expect(text.length).toBeLessThan(70_000);
    expect(text).toContain("[0] 사용자");
    expect(text).toContain("[1999] AI");
    expect(text).toMatch(/턴 생략/);
  });
});
