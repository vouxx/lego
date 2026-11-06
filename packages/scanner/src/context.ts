import { maskSecrets } from "./secrets";
import type { Candidate, SourceFile } from "./types";

const MAX_LINE_CHARS = 500;
const MAX_CONTEXT_CHARS = 12_000;

/**
 * LLM 에 넘길 주변 코드. 줄 번호를 붙이고 비밀값은 가린다.
 * 여러 줄에 걸친 개인 키도 가려지도록 파일 전체를 먼저 가리고, 줄 길이와 전체 길이를 제한한다.
 */
export function codeContext(
  file: SourceFile | undefined,
  candidate: Candidate,
  padding = 15,
  maxLines = 120,
) {
  if (!file) return maskSecrets(candidate.snippet);
  const lines = maskSecrets(file.content).split("\n");
  const start = Math.max(1, candidate.lineStart - padding);
  const end = Math.min(
    lines.length,
    candidate.lineEnd + padding,
    start + maxLines - 1,
  );
  return lines
    .slice(start - 1, end)
    .map(
      (line, i) =>
        `${String(start + i).padStart(4)} | ${line.slice(0, MAX_LINE_CHARS)}`,
    )
    .join("\n")
    .slice(0, MAX_CONTEXT_CHARS);
}
