import type { Candidate, Rule, SourceFile } from "./types";

export type * from "./types";
export { detectByRegex } from "./detectors/regex";

/** 활성화된 규칙을 모두 실행해 후보 목록을 돌려준다. */
export function runRules(rules: Rule[], files: SourceFile[]): Candidate[] {
  return rules.flatMap((rule) => rule.detect(files));
}
