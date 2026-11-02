import { STATIC_RULES } from "./rules";
import type { Candidate, Rule, ScanInput } from "./types";

export type * from "./types";
export { codeContext } from "./context";
export { fingerprint } from "./fingerprint";
export { isEnvFile, isEnvTemplate, isJsFile, isSqlFile } from "./files";
export { maskSecrets } from "./secrets";
export { STATIC_RULES };

/** 규칙을 모두 실행해 후보 목록을 돌려준다. 규칙 하나가 실패해도 나머지는 계속한다. */
export function runRules(input: ScanInput, rules: Rule[] = STATIC_RULES) {
  const candidates: Candidate[] = [];
  const errors: { ruleId: string; message: string }[] = [];
  for (const rule of rules) {
    try {
      candidates.push(...rule.detect(input));
    } catch (error) {
      errors.push({
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { candidates, errors };
}
