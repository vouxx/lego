import { findEndpoints } from "../detectors/endpoints";
import { lineRange } from "../detectors/js-ast";
import type { Candidate, Rule } from "../types";

// 함수 안에서 인증·서명 확인을 하는 흔한 호출. 없으면 후보로 올리고 LLM 이 주변 코드로 판단한다.
const AUTH_MARKER =
  /\b(auth|getUser|getSession|getClaims|getServerSession|currentUser|requireUser|getCurrentUser|requireAuth|withAuth|verify\w*|constructEvent|validateRequest|checkAuth|isAuthenticated|session)\b/;

/** SEC-007 인증 확인 없는 Route Handler / Server Action */
export const sec007: Rule = {
  id: "SEC-007",
  title: "인증 확인 없는 Route Handler / Server Action",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const endpoint of files.flatMap(findEndpoints)) {
      if (!endpoint.mutating || AUTH_MARKER.test(endpoint.source)) continue;
      // 웹훅은 SEC-012 가 서명 검증을 따로 본다.
      if (/webhook/i.test(endpoint.file.path)) continue;
      const { lineStart, lineEnd } = lineRange(endpoint.node);
      candidates.push({
        ruleId: "SEC-007",
        severity: "high",
        filePath: endpoint.file.path,
        lineStart,
        lineEnd,
        snippet:
          endpoint.file.content.split("\n")[lineStart - 1]?.trim() ??
          endpoint.name,
        reason: `${endpoint.kind} ${endpoint.name} 안에서 인증 확인 호출을 찾지 못함`,
      });
    }
    return candidates;
  },
};
