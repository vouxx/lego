import {
  normalizeTableName,
  splitSqlStatements,
  TABLE_NAME,
} from "../detectors/sql";
import { isSqlFile } from "../files";
import type { Candidate, Rule } from "../types";

const CREATE_TABLE = new RegExp(
  String.raw`^create\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?${TABLE_NAME}`,
  "i",
);
const TEMP_TABLE = /^create\s+(?:global\s+|local\s+)?temp(?:orary)?\s+table/i;
const ENABLE_RLS = new RegExp(
  String.raw`^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${TABLE_NAME}[\s\S]*\benable\s+row\s+level\s+security`,
  "i",
);
const DROP_TABLE = new RegExp(
  String.raw`^drop\s+table\s+(?:if\s+exists\s+)?${TABLE_NAME}`,
  "i",
);

/** SEC-005 테이블 생성 후 RLS 미활성화. 마이그레이션 전체를 순서대로 보고 판단한다. */
export const sec005: Rule = {
  id: "SEC-005",
  title: "테이블 생성 후 RLS 미활성화",
  severity: "high",
  detector: "sql",
  detect: ({ files }) => {
    const created = new Map<
      string,
      { path: string; line: number; text: string }
    >();
    const enabled = new Set<string>();

    const sqlFiles = files
      .filter((f) => isSqlFile(f.path))
      .sort((a, b) => a.path.localeCompare(b.path));
    for (const file of sqlFiles) {
      for (const stmt of splitSqlStatements(file.content)) {
        if (TEMP_TABLE.test(stmt.text)) continue;
        const create = stmt.text.match(CREATE_TABLE);
        if (create) {
          created.set(normalizeTableName(create[1]!), {
            path: file.path,
            line: stmt.line,
            text: stmt.text,
          });
          continue;
        }
        const enable = stmt.text.match(ENABLE_RLS);
        if (enable) enabled.add(normalizeTableName(enable[1]!));
        const drop = stmt.text.match(DROP_TABLE);
        if (drop) created.delete(normalizeTableName(drop[1]!));
      }
    }

    const candidates: Candidate[] = [];
    for (const [table, at] of created) {
      if (enabled.has(table)) continue;
      candidates.push({
        ruleId: "SEC-005",
        severity: "high",
        filePath: at.path,
        lineStart: at.line,
        lineEnd: at.line,
        snippet: at.text.split("\n")[0]!.trim(),
        reason: `${table} 테이블에 enable row level security 가 없음`,
      });
    }
    return candidates;
  },
};
