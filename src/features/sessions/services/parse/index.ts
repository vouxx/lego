import type { SessionMessage, SessionTool } from "../../schemas";
import { parseClaudeCode } from "./claude-code";
import { parseCursorMarkdown, parsePlainText } from "./markdown";

/** 파일 이름과 내용으로 형식을 짐작한다. */
export function detectTool(fileName: string, raw: string): SessionTool {
  const firstLine = raw.split("\n").find((l) => l.trim()) ?? "";
  if (fileName.endsWith(".jsonl") || /^\{.*"type"\s*:/.test(firstLine)) {
    return "claude_code";
  }
  if (/^\s*(?:_\*\*|\*\*|#{1,4}\s+)(user|cursor|assistant)/im.test(raw)) {
    return "cursor";
  }
  return "text";
}

export function parseSession(tool: SessionTool, raw: string): SessionMessage[] {
  if (tool === "claude_code") return parseClaudeCode(raw);
  if (tool === "cursor") return parseCursorMarkdown(raw);
  return parsePlainText(raw);
}
