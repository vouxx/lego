import type { SessionMessage } from "../../schemas";

type Block = {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: unknown;
  is_error?: boolean;
};
type Line = {
  type?: string;
  isSidechain?: boolean;
  timestamp?: string;
  message?: { id?: string; role?: string; content?: unknown };
};

const NOISE =
  /<(system-reminder|command-[a-z-]+|local-command-[a-z-]+)>[\s\S]*?<\/\1>/g;

/** 도구 입력에서 대상(파일 경로·명령) 하나를 고른다. */
export function toolTarget(input: Record<string, unknown> | undefined) {
  if (!input) return null;
  for (const key of [
    "file_path",
    "path",
    "notebook_path",
    "command",
    "pattern",
    "url",
  ]) {
    const value = input[key];
    if (typeof value === "string") return value.slice(0, 200);
  }
  return null;
}

function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c: Block) => (typeof c?.text === "string" ? c.text : ""))
      .join("\n");
  }
  return "";
}

/**
 * Claude Code 대화 로그(JSONL). user/assistant 줄만 쓰고, 생각(thinking)과 서브에이전트(sidechain)는 뺀다.
 * 같은 응답이 블록마다 한 줄씩 나뉘어 있어서 message.id 가 같으면 합친다.
 */
export function parseClaudeCode(raw: string): SessionMessage[] {
  const messages: SessionMessage[] = [];
  let lastAssistantId: string | null = null;

  for (const rawLine of raw.split("\n")) {
    if (!rawLine.trim()) continue;
    let line: Line;
    try {
      line = JSON.parse(rawLine) as Line;
    } catch {
      continue;
    }
    if (line.isSidechain || !line.message) continue;
    const content = line.message.content;

    if (line.type === "user") {
      lastAssistantId = null;
      if (typeof content === "string") {
        const text = content.replace(NOISE, "").trim();
        if (text)
          messages.push({ role: "user", text, timestamp: line.timestamp });
        continue;
      }
      for (const block of (Array.isArray(content) ? content : []) as Block[]) {
        if (block.type === "text" && block.text?.replace(NOISE, "").trim()) {
          messages.push({
            role: "user",
            text: block.text.replace(NOISE, "").trim(),
            timestamp: line.timestamp,
          });
        } else if (block.type === "tool_result") {
          messages.push({
            role: "tool",
            text: resultText(block.content).slice(0, 4_000),
            isError: Boolean(block.is_error),
            timestamp: line.timestamp,
          });
        }
      }
      continue;
    }

    if (line.type === "assistant" && Array.isArray(content)) {
      const blocks = content as Block[];
      const text = blocks
        .filter((b) => b.type === "text" && b.text)
        .map((b) => b.text!)
        .join("\n");
      const tools = blocks
        .filter((b) => b.type === "tool_use" && b.name)
        .map((b) => ({ name: b.name!, target: toolTarget(b.input) }));
      if (!text && tools.length === 0) continue;

      const previous = messages.at(-1);
      const id = line.message.id ?? null;
      if (id && id === lastAssistantId && previous?.role === "assistant") {
        previous.text = [previous.text, text].filter(Boolean).join("\n");
        previous.tools = [...(previous.tools ?? []), ...tools];
      } else {
        messages.push({
          role: "assistant",
          text,
          tools,
          timestamp: line.timestamp,
        });
      }
      lastAssistantId = id;
    }
  }
  return messages;
}
