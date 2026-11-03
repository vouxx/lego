import { splitSqlStatements } from "../detectors/sql";
import { isJsFile, isSqlFile, lineAt } from "../files";
import type { Candidate, Rule } from "../types";

const BUCKET_INSERT =
  /^insert\s+into\s+storage\.buckets\s*\(([^)]*)\)\s*values\s*([\s\S]*)$/i;
const BUCKET_UPDATE =
  /^update\s+storage\.buckets\s+set\s+[\s\S]*\bpublic\s*=\s*true\b/i;
const OBJECTS_POLICY = /^create\s+policy\s[\s\S]*?\bon\s+storage\.objects\b/i;
const ALWAYS_TRUE = /\b(using|with\s+check)\s*\(\s*\(?\s*true\s*\)?\s*\)/i;
// 사용자·소유자를 확인하는 조건
const USER_CHECK =
  /auth\.(?:uid|jwt|role)\(\)|\bowner(?:_id)?\b|storage\.foldername|\(\s*select\s+auth\./i;
const WRITE_COMMAND = /\bfor\s+(insert|update|delete|all)\b/i;
const JS_PUBLIC_BUCKET =
  /\.(?:createBucket|updateBucket)\(\s*[^,)]+,\s*\{[^}]*\bpublic\s*:\s*true/g;

const bucketName = (values: string) => values.match(/'([^']+)'/)?.[1] ?? "";

/** insert into storage.buckets (id, name, public) values ('a', 'a', true) 에서 public 이 true 인 버킷 */
function publicBuckets(columns: string, values: string) {
  const cols = columns
    .split(",")
    .map((c) => c.trim().replace(/"/g, "").toLowerCase());
  const at = cols.indexOf("public");
  if (at === -1) return [];
  const tuples = values.match(/\(([^()]*)\)/g) ?? [];
  return tuples
    .map((t) =>
      t
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim()),
    )
    .filter((v) => v[at]?.toLowerCase() === "true")
    .map((v) => v[0]?.replace(/'/g, "") ?? "");
}

/** SEC-022 공개 Storage 버킷 / 넓게 열린 Storage 정책 */
export const sec022: Rule = {
  id: "SEC-022",
  title: "공개 Storage 버킷 / 넓게 열린 Storage 정책",
  severity: "high",
  detector: "sql",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    const push = (
      path: string,
      line: number,
      lines: number,
      snippet: string,
      severity: "high" | "medium",
      reason: string,
    ) =>
      candidates.push({
        ruleId: "SEC-022",
        severity,
        filePath: path,
        lineStart: line,
        lineEnd: line + lines - 1,
        snippet,
        reason,
      });

    for (const file of files) {
      if (isJsFile(file.path)) {
        for (const m of file.content.matchAll(JS_PUBLIC_BUCKET)) {
          const line = lineAt(file.content, m.index);
          push(
            file.path,
            line,
            1,
            file.content.split("\n")[line - 1]?.trim() ?? "",
            "medium",
            "Storage 버킷을 public: true 로 만들어 주소만 알면 누구나 파일을 받을 수 있음",
          );
        }
        continue;
      }
      if (!isSqlFile(file.path)) continue;
      for (const stmt of splitSqlStatements(file.content)) {
        const lines = stmt.text.split("\n").length;
        const insert = stmt.text.match(BUCKET_INSERT);
        if (insert) {
          const names = publicBuckets(insert[1]!, insert[2]!);
          if (names.length > 0)
            push(
              file.path,
              stmt.line,
              lines,
              stmt.text,
              "medium",
              `공개 버킷(${names.join(", ")})은 주소만 알면 로그인 없이 파일을 받을 수 있음`,
            );
          continue;
        }
        if (BUCKET_UPDATE.test(stmt.text)) {
          push(
            file.path,
            stmt.line,
            lines,
            stmt.text,
            "medium",
            `버킷 ${bucketName(stmt.text)} 를 public = true 로 바꿈`,
          );
          continue;
        }
        if (!OBJECTS_POLICY.test(stmt.text)) continue;
        // using (true) 는 SEC-006 이 본다.
        if (ALWAYS_TRUE.test(stmt.text) || USER_CHECK.test(stmt.text)) continue;
        const write = stmt.text.match(WRITE_COMMAND);
        push(
          file.path,
          stmt.line,
          lines,
          stmt.text,
          write ? "high" : "medium",
          write
            ? `storage.objects ${write[1]!.toLowerCase()} 정책에 사용자 확인(auth.uid())이 없어 누구나 파일을 올리거나 지울 수 있음`
            : "storage.objects 읽기 정책에 사용자 확인(auth.uid())이 없어 버킷의 모든 파일을 누구나 읽을 수 있음",
        );
      }
    }
    return candidates;
  },
};
