import { findSecrets } from "../secrets";
import { isEnvFile, isEnvTemplate } from "../files";
import type { Candidate, Rule } from "../types";

/** SEC-001 코드에 하드코딩된 API 키/토큰 */
export const sec001: Rule = {
  id: "SEC-001",
  title: "코드에 하드코딩된 API 키/토큰",
  severity: "critical",
  detector: "regex",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      // .env 는 SEC-002 가 다룬다. 템플릿의 예시 값은 형식이 맞아도 검사한다(실제 키를 붙여넣는 실수가 잦다).
      if (isEnvFile(file.path) && !isEnvTemplate(file.path)) continue;
      file.content.split("\n").forEach((line, index) => {
        for (const secret of findSecrets(line)) {
          candidates.push({
            ruleId: "SEC-001",
            severity: "critical",
            filePath: file.path,
            lineStart: index + 1,
            lineEnd: index + 1,
            snippet: line.trim(),
            reason: `${secret.name} 형식의 값`,
          });
        }
      });
    }
    return candidates;
  },
};
