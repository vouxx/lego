import type { Candidate, Severity, SourceFile } from "../types";

type RegexDetectorOptions = {
  ruleId: string;
  severity: Severity;
  pattern: RegExp;
  include?: (path: string) => boolean;
};

/** 파일마다 줄 단위로 정규식을 돌려 후보를 만든다. */
export function detectByRegex(
  files: SourceFile[],
  { ruleId, severity, pattern, include = () => true }: RegexDetectorOptions,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const file of files) {
    if (!include(file.path)) continue;

    file.content.split("\n").forEach((line, index) => {
      if (!pattern.test(line)) return;
      candidates.push({
        ruleId,
        severity,
        filePath: file.path,
        lineStart: index + 1,
        lineEnd: index + 1,
        snippet: line.trim(),
      });
    });
  }

  return candidates;
}
