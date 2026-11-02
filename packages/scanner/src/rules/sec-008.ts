import type { Node } from "@babel/types";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

// 문자열 SQL 을 그대로 실행하는 메서드. sql`...` 같은 태그 템플릿은 값이 파라미터로 바뀌므로 안전하다.
const RAW_METHODS = new Set([
  "query",
  "raw",
  "execute",
  "exec",
  "prepare",
  "unsafe",
  "$queryRawUnsafe",
  "$executeRawUnsafe",
  "whereRaw",
  "orderByRaw",
]);
const SQL_KEYWORD =
  /\b(select|insert|update|delete|where|from|values|order\s+by)\b/i;

function calleeName(callee: Node): string | null {
  if (callee.type === "Identifier") return callee.name;
  if (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier"
  )
    return callee.property.name;
  return null;
}

function isDynamicSql(arg: Node): boolean {
  if (arg.type === "TemplateLiteral") {
    return (
      arg.expressions.length > 0 &&
      SQL_KEYWORD.test(arg.quasis.map((q) => q.value.raw).join(" "))
    );
  }
  if (arg.type === "BinaryExpression" && arg.operator === "+") {
    const parts: Node[] = [];
    const collect = (n: Node) => {
      if (n.type === "BinaryExpression" && n.operator === "+") {
        collect(n.left);
        collect(n.right);
      } else parts.push(n);
    };
    collect(arg);
    const hasSql = parts.some(
      (p) => p.type === "StringLiteral" && SQL_KEYWORD.test(p.value),
    );
    const hasDynamic = parts.some(
      (p) => p.type !== "StringLiteral" && p.type !== "NumericLiteral",
    );
    return hasSql && hasDynamic;
  }
  return false;
}

/** SEC-008 사용자 입력을 문자열로 이어 붙인 SQL */
export const sec008: Rule = {
  id: "SEC-008",
  title: "사용자 입력을 문자열로 이어 붙인 SQL",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path) || !SQL_KEYWORD.test(file.content)) continue;
      const ast = parseJs(file.content);
      if (!ast) continue;

      walk(ast, (node) => {
        if (node.type !== "CallExpression") return;
        const name = calleeName(node.callee);
        const first = node.arguments[0];
        if (!name || !RAW_METHODS.has(name) || !first || !isDynamicSql(first))
          return;

        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-008",
          severity: "high",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content
            .split("\n")
            .slice(lineStart - 1, Math.min(lineEnd, lineStart + 4))
            .join("\n")
            .trim(),
          reason: `${name}() 에 값을 이어 붙인 SQL 문자열을 넘김`,
        });
      });
    }
    return candidates;
  },
};
