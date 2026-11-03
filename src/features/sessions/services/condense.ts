import type { SessionMessage, SessionStats } from "../schemas";

const MAX_CHARS = 60_000;
const USER_CHARS = 1_500;
const ASSISTANT_CHARS = 300;
const TOOL_CHARS = 200;

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…(생략)` : text;
}

function render(m: SessionMessage, index: number) {
  if (m.role === "user")
    return `[${index}] 사용자: ${clip(m.text, USER_CHARS)}`;
  if (m.role === "tool") {
    return `[${index}] 도구 결과${m.isError ? "(오류)" : ""}: ${clip(m.text, TOOL_CHARS)}`;
  }
  const tools = (m.tools ?? [])
    .map((t) => `${t.name}${t.target ? `(${t.target})` : ""}`)
    .join(", ");
  return `[${index}] AI: ${clip(m.text, ASSISTANT_CHARS)}${tools ? ` [도구: ${tools}]` : ""}`;
}

/**
 * 긴 세션을 LLM 에 넣을 크기로 줄인다. 사용자 메시지는 길게, AI·도구는 짧게 남긴다.
 * 그래도 넘치면 처음과 끝을 지키고 가운데는 사용자 메시지 위주로 고르게 뽑는다. [번호]는 원래 턴 번호다.
 */
export function condenseTranscript(messages: SessionMessage[]) {
  const lines = messages.map(render);
  const total = lines.reduce((n, l) => n + l.length + 1, 0);
  if (total <= MAX_CHARS) return lines.join("\n");

  const keep = new Set<number>();
  const head = Math.min(20, lines.length);
  const tail = Math.max(lines.length - 20, head);
  for (let i = 0; i < head; i++) keep.add(i);
  for (let i = tail; i < lines.length; i++) keep.add(i);
  let used = [...keep].reduce((n, i) => n + lines[i]!.length + 1, 0);

  const middleUsers = messages
    .map((m, i) => ({ m, i }))
    .filter(({ m, i }) => m.role === "user" && i >= head && i < tail);
  const step = Math.max(1, Math.ceil(middleUsers.length / 80));
  for (let k = 0; k < middleUsers.length && used < MAX_CHARS; k += step) {
    const { i } = middleUsers[k]!;
    keep.add(i);
    used += lines[i]!.length + 1;
  }

  const out: string[] = [];
  let previous = -1;
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (previous >= 0 && i > previous + 1)
      out.push(`… (${i - previous - 1}턴 생략) …`);
    out.push(lines[i]!);
    previous = i;
  }
  return out.join("\n");
}

export function statsText(stats: SessionStats) {
  const parts = [
    `턴 ${stats.turns}개(사용자 ${stats.userTurns}), 도구 호출 ${stats.toolCalls}번, 약 ${stats.approxTokens.toLocaleString()} 토큰`,
  ];
  if (stats.durationMinutes !== null)
    parts.push(`약 ${stats.durationMinutes}분`);
  if (stats.repeatedEdits.length) {
    parts.push(
      `여러 번 고친 파일: ${stats.repeatedEdits.map((e) => `${e.file} ${e.count}번`).join(", ")}`,
    );
  }
  if (stats.repeatedErrors.length) {
    parts.push(
      `반복된 오류: ${stats.repeatedErrors.map((e) => `"${e.error}" ${e.count}번`).join(", ")}`,
    );
  }
  return parts.join("\n");
}
