import { findEndpoints } from "../detectors/endpoints";
import { lineAt } from "../files";
import type { Candidate, Rule } from "../types";

const LLM_CALL =
  /\b(?:messages\.(?:create|stream)|chat\.completions\.create|responses\.create|generateText|streamText|generateObject|streamObject|generateContent)\s*\(|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com/;
const LIMITED =
  /rate_?limit|ratelimit|limiter|quota|throttle|upstash|maxRequests|usage_?limit|creditsRemaining/i;

/** SEC-013 사용자가 부를 수 있는 LLM 호출에 사용량 제한이 없음(비용 폭탄) */
export const sec013: Rule = {
  id: "SEC-013",
  title: "LLM API 호출에 사용량 제한 없음",
  severity: "medium",
  detector: "llm",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const endpoint of files.flatMap(findEndpoints)) {
      const match = LLM_CALL.exec(endpoint.source);
      if (!match || LIMITED.test(endpoint.file.content)) continue;
      const line = lineAt(
        endpoint.file.content,
        (endpoint.node.start ?? 0) + match.index,
      );
      candidates.push({
        ruleId: "SEC-013",
        severity: "medium",
        filePath: endpoint.file.path,
        lineStart: line,
        lineEnd: line,
        snippet: endpoint.file.content.split("\n")[line - 1]?.trim() ?? "",
        reason: `${endpoint.kind} ${endpoint.name} 에서 LLM 을 호출하는데 사용량 제한이 보이지 않음`,
      });
    }
    return candidates;
  },
};
