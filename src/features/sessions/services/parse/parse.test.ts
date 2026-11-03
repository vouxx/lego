import { describe, expect, it } from "vitest";
import { detectTool, parseSession } from ".";

describe("parseClaudeCode", () => {
  const log = [
    JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: "로그인 만들어 줘<system-reminder>무시</system-reminder>",
      },
      timestamp: "2026-11-03T00:00:00Z",
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "a",
        role: "assistant",
        content: [{ type: "thinking", thinking: "..." }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "a",
        role: "assistant",
        content: [{ type: "text", text: "만들게요" }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        id: "a",
        role: "assistant",
        content: [
          { type: "tool_use", name: "Edit", input: { file_path: "src/a.ts" } },
        ],
      },
    }),
    JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", content: "Error: x", is_error: true }],
      },
    }),
    JSON.stringify({ type: "summary", summary: "x" }),
    "not json",
  ].join("\n");

  it("같은 응답 블록을 합치고 생각·잡음은 뺀다", () => {
    expect(parseSession("claude_code", log)).toEqual([
      {
        role: "user",
        text: "로그인 만들어 줘",
        timestamp: "2026-11-03T00:00:00Z",
      },
      {
        role: "assistant",
        text: "만들게요",
        tools: [{ name: "Edit", target: "src/a.ts" }],
        timestamp: undefined,
      },
      { role: "tool", text: "Error: x", isError: true, timestamp: undefined },
    ]);
  });
});

describe("Cursor 마크다운·텍스트", () => {
  it("SpecStory 형식 화자 줄로 나눈다", () => {
    const md =
      "# 제목\n\n_**User**_\n\n버튼 고쳐줘\n\n---\n\n_**Assistant**_\n\n고쳤습니다\n";
    expect(parseSession("cursor", md)).toEqual([
      { role: "user", text: "버튼 고쳐줘" },
      { role: "assistant", text: "고쳤습니다" },
    ]);
  });

  it("User: / AI: 텍스트를 나누고, 화자가 없으면 한 덩어리", () => {
    expect(parseSession("text", "User: 안녕\n이어서\nAI: 네")).toEqual([
      { role: "user", text: "안녕\n이어서" },
      { role: "assistant", text: "네" },
    ]);
    expect(parseSession("text", "그냥 메모")).toEqual([
      { role: "user", text: "그냥 메모" },
    ]);
  });

  it("형식을 짐작한다", () => {
    expect(detectTool("a.jsonl", "{}")).toBe("claude_code");
    expect(detectTool("chat.md", "_**User**_\nhi")).toBe("cursor");
    expect(detectTool("a.txt", "User: hi")).toBe("text");
  });
});
