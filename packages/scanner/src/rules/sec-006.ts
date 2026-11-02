import { splitSqlStatements } from "../detectors/sql";
import { isSqlFile } from "../files";
import type { Candidate, Rule } from "../types";

const POLICY = /^create\s+policy/i;
const ALWAYS_TRUE = /\b(using|with\s+check)\s*\(\s*\(?\s*true\s*\)?\s*\)/i;

/** SEC-006 RLS 정책이 using (true) 로 전체 허용 */
export const sec006: Rule = {
  id: "SEC-006",
  title: "RLS 정책이 using (true) 로 전체 허용",
  severity: "high",
  detector: "sql",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isSqlFile(file.path)) continue;
      for (const stmt of splitSqlStatements(file.content)) {
        if (!POLICY.test(stmt.text)) continue;
        const match = stmt.text.match(ALWAYS_TRUE);
        if (!match) continue;
        candidates.push({
          ruleId: "SEC-006",
          severity: "high",
          filePath: file.path,
          lineStart: stmt.line,
          lineEnd: stmt.line + stmt.text.split("\n").length - 1,
          snippet: stmt.text,
          reason: `정책의 ${match[1]!.toLowerCase()} 조건이 true`,
        });
      }
    }
    return candidates;
  },
};
