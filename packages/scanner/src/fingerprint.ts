import { createHash } from "node:crypto";
import { maskSecrets } from "./secrets";
import type { Candidate } from "./types";

/**
 * 스캔 간 같은 문제를 알아보는 키. 줄 번호는 넣지 않아서 위쪽 코드가 바뀌어도 유지된다.
 * hash(rule_id + file_path + 공백을 정리한 코드)
 */
export function fingerprint(
  candidate: Pick<Candidate, "ruleId" | "filePath" | "snippet">,
) {
  const normalized = maskSecrets(candidate.snippet).replace(/\s+/g, " ").trim();
  return createHash("sha256")
    .update(`${candidate.ruleId}\n${candidate.filePath}\n${normalized}`)
    .digest("hex")
    .slice(0, 32);
}
