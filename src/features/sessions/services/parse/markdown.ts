import type { SessionMessage } from "../../schemas";

// Cursor 내보내기(SpecStory 형식 포함): "_**User**_", "**Cursor**", "## User" 같은 화자 줄로 나뉜다.
const CURSOR_SPEAKER =
  /^\s*(?:_\*\*|\*\*|#{1,4}\s+)(user|human|me|assistant|cursor|ai|claude|model)(?:\s*\([^)]*\))?\s*(?:\*\*_|\*\*)?\s*:?\s*$/i;
// 일반 텍스트: "User: ..." 처럼 줄 앞에 화자가 붙는다.
const TEXT_SPEAKER =
  /^\s*(user|human|me|나|assistant|ai|claude|cursor|gpt)\s*[:：]\s?(.*)$/i;

function roleOf(name: string): SessionMessage["role"] {
  return /^(user|human|me|나)$/i.test(name) ? "user" : "assistant";
}

function finish(messages: SessionMessage[]) {
  return messages
    .map((m) => ({ ...m, text: m.text.replace(/^\s*---\s*$/gm, "").trim() }))
    .filter((m) => m.text);
}

export function parseCursorMarkdown(raw: string): SessionMessage[] {
  const messages: SessionMessage[] = [];
  for (const line of raw.split("\n")) {
    const match = line.match(CURSOR_SPEAKER);
    if (match) messages.push({ role: roleOf(match[1]!), text: "" });
    else if (messages.length > 0) messages.at(-1)!.text += `${line}\n`;
  }
  return finish(messages);
}

export function parsePlainText(raw: string): SessionMessage[] {
  const messages: SessionMessage[] = [];
  for (const line of raw.split("\n")) {
    const match = line.match(TEXT_SPEAKER);
    if (match)
      messages.push({ role: roleOf(match[1]!), text: `${match[2] ?? ""}\n` });
    else if (messages.length > 0) messages.at(-1)!.text += `${line}\n`;
  }
  const parsed = finish(messages);
  // 화자 표시가 없으면 통째로 사용자 메시지 하나로 본다.
  return parsed.length > 0
    ? parsed
    : raw.trim()
      ? [{ role: "user", text: raw.trim() }]
      : [];
}
