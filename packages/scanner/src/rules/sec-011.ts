import { isJsFile, lineAt } from "../files";
import type { Candidate, Rule } from "../types";

// 모든 출처 허용(*) 또는 요청의 Origin 을 그대로 돌려주는 설정
const ANY_ORIGIN =
  /Access-Control-Allow-Origin["'`]?\s*[,:]\s*(?:["'`]\*["'`]|[\w.?]*(?:origin\b|headers\.get\(\s*["'`]origin))|\borigin\s*:\s*(?:["'`]\*["'`]|true\b)/gi;
const WITH_CREDENTIALS =
  /Access-Control-Allow-Credentials["'`]?\s*[,:]\s*["'`]?true|\bcredentials\s*:\s*true\b/i;

/** SEC-011 CORS 로 모든 출처를 허용하면서 인증 쿠키도 받음 */
export const sec011: Rule = {
  id: "SEC-011",
  title: "CORS Access-Control-Allow-Origin: * + 인증 쿠키",
  severity: "medium",
  detector: "regex",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path) || !WITH_CREDENTIALS.test(file.content))
        continue;
      for (const match of file.content.matchAll(ANY_ORIGIN)) {
        const line = lineAt(file.content, match.index);
        candidates.push({
          ruleId: "SEC-011",
          severity: "medium",
          filePath: file.path,
          lineStart: line,
          lineEnd: line,
          snippet: file.content.split("\n")[line - 1]?.trim() ?? match[0],
          reason:
            "모든 출처(또는 요청 Origin 그대로)를 허용하면서 credentials 도 허용함",
        });
      }
    }
    return candidates;
  },
};
