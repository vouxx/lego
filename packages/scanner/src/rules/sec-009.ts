import { findEndpoints } from "../detectors/endpoints";
import { lineAt } from "../files";
import type { Candidate, Rule } from "../types";

// 요청에서 온 id 로 행 하나를 고르는 흔한 모양: Supabase .eq("id", x), Prisma where: { id }, SQL where id = $1
const BY_ID =
  /\.(?:eq|match)\(\s*["'`](?:id|\w+_id)["'`]|\bwhere\s*:\s*\{\s*(?:id|\w+Id)\b|\bwhere\s+(?:\w+\.)?(?:id|\w+_id)\s*=\s*(?:\$\d|\?|:\w)|\beq\(\s*\w+\.(?:id|\w+Id)\s*,/;
// 소유자를 같이 확인하는 흔한 표시. 있으면 후보에서 뺀다.
const OWNER_CHECK =
  /\b(?:user_?id|owner\w*|author_?id|created_?by|auth\.uid|member\w*|team_?id|org\w*_?id)\b|\buser\.id\b|session\.user/i;
// 요청 입력을 쓰는지. Server Action 은 인자 자체가 사용자 입력이다.
const REQUEST_INPUT =
  /\bparams\b|searchParams|\.json\(\)|formData|req\.query|req\.body/;

/** SEC-009 다른 사용자의 id 로 조회/수정 가능 (IDOR). 후보만 올리고 판단은 LLM 이 한다. */
export const sec009: Rule = {
  id: "SEC-009",
  title: "다른 사용자의 id 로 조회/수정 가능 (IDOR)",
  severity: "high",
  detector: "llm",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const endpoint of files.flatMap(findEndpoints)) {
      const match = BY_ID.exec(endpoint.source);
      if (!match || OWNER_CHECK.test(endpoint.source)) continue;
      if (
        endpoint.kind === "Route Handler" &&
        !REQUEST_INPUT.test(endpoint.source)
      )
        continue;
      const offset = (endpoint.node.start ?? 0) + match.index;
      const line = lineAt(endpoint.file.content, offset);
      candidates.push({
        ruleId: "SEC-009",
        severity: "high",
        filePath: endpoint.file.path,
        lineStart: line,
        lineEnd: line,
        snippet: endpoint.file.content.split("\n")[line - 1]?.trim() ?? "",
        reason: `${endpoint.kind} ${endpoint.name} 가 요청으로 받은 id 로 데이터를 다루는데 소유자 확인이 보이지 않음`,
      });
    }
    return candidates;
  },
};
