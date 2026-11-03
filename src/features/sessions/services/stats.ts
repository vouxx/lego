import type { SessionMessage, SessionStats } from "../schemas";

const EDIT_TOOLS =
  /^(edit|multiedit|write|str_replace|str_replace_based_edit_tool|notebookedit|apply_patch)$/i;

/** 첫 오류 줄을 정규화한다(숫자·경로 차이를 무시해 같은 오류를 묶는다). */
export function errorSignature(text: string) {
  const line =
    text.split("\n").find((l) => /error|exception|failed|실패|오류/i.test(l)) ??
    "";
  return line
    .replace(/\d+/g, "N")
    .replace(/(["'`]).*?\1/g, "…")
    .trim()
    .slice(0, 160);
}

/** LLM 없이 세는 통계. 막힌 지점(같은 파일 반복 수정, 같은 오류 반복)의 근거가 된다. */
export function computeStats(
  messages: SessionMessage[],
  maskedCount: number,
): SessionStats {
  const toolCounts = new Map<string, number>();
  const edits = new Map<string, number>();
  const errors = new Map<string, number>();
  let approxChars = 0;

  for (const m of messages) {
    approxChars += m.text.length;
    for (const tool of m.tools ?? []) {
      toolCounts.set(tool.name, (toolCounts.get(tool.name) ?? 0) + 1);
      if (EDIT_TOOLS.test(tool.name) && tool.target) {
        edits.set(tool.target, (edits.get(tool.target) ?? 0) + 1);
      }
    }
    if (
      m.role === "tool" &&
      (m.isError || /\b(error|exception)\b/i.test(m.text))
    ) {
      const sig = errorSignature(m.text);
      if (sig) errors.set(sig, (errors.get(sig) ?? 0) + 1);
    }
  }

  const times = messages
    .map((m) => (m.timestamp ? Date.parse(m.timestamp) : NaN))
    .filter((t) => Number.isFinite(t));
  const top = <K extends string>(
    map: Map<string, number>,
    min: number,
    key: K,
  ) =>
    [...map.entries()]
      .filter(([, count]) => count >= min)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(
        ([value, count]) =>
          ({ [key]: value, count }) as Record<K, string> & { count: number },
      );

  return {
    turns: messages.length,
    userTurns: messages.filter((m) => m.role === "user").length,
    assistantTurns: messages.filter((m) => m.role === "assistant").length,
    toolCalls: [...toolCounts.values()].reduce((a, b) => a + b, 0),
    topTools: top(toolCounts, 1, "name"),
    repeatedEdits: top(edits, 3, "file"),
    repeatedErrors: top(errors, 2, "error"),
    approxTokens: Math.round(approxChars / 4),
    durationMinutes:
      times.length >= 2
        ? Math.round((Math.max(...times) - Math.min(...times)) / 60_000)
        : null,
    maskedCount,
  };
}
