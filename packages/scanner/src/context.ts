import { maskSecrets } from "./secrets";
import type { Candidate, SourceFile } from "./types";

/** LLM 에 넘길 주변 코드. 줄 번호를 붙이고 비밀값은 가린다. */
export function codeContext(
  file: SourceFile | undefined,
  candidate: Candidate,
  padding = 15,
  maxLines = 120,
) {
  if (!file) return maskSecrets(candidate.snippet);
  const lines = file.content.split("\n");
  const start = Math.max(1, candidate.lineStart - padding);
  const end = Math.min(
    lines.length,
    candidate.lineEnd + padding,
    start + maxLines - 1,
  );
  return lines
    .slice(start - 1, end)
    .map((line, i) => `${String(start + i).padStart(4)} | ${maskSecrets(line)}`)
    .join("\n");
}
