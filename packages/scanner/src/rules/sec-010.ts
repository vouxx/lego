import type { Node } from "@babel/types";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

const SANITIZER = /sanitize|purify|escape|xss|dompurify/i;

function calleeText(node: Node): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression")
    return `${calleeText(node.object)}.${node.property.type === "Identifier" ? node.property.name : ""}`;
  if (node.type === "CallExpression") return calleeText(node.callee);
  return "";
}

/** 정적인 문자열이거나 살균 함수를 거친 값이면 안전하다. */
function isSafeHtml(value: Node): boolean {
  if (value.type === "StringLiteral") return true;
  if (value.type === "TemplateLiteral") return value.expressions.length === 0;
  if (value.type === "CallExpression") {
    const name = calleeText(value.callee);
    if (SANITIZER.test(name)) return true;
    // JSON-LD: JSON.stringify(data).replace(/</g, "\\u003c")
    if (name.startsWith("JSON.stringify") && name.endsWith(".replace"))
      return true;
  }
  return false;
}

function htmlValue(attrValue: Node | null | undefined): Node | null {
  if (attrValue?.type !== "JSXExpressionContainer") return null;
  const expr = attrValue.expression;
  if (expr.type !== "ObjectExpression")
    return expr.type === "JSXEmptyExpression" ? null : expr;
  for (const prop of expr.properties) {
    if (
      prop.type === "ObjectProperty" &&
      ((prop.key.type === "Identifier" && prop.key.name === "__html") ||
        (prop.key.type === "StringLiteral" && prop.key.value === "__html"))
    )
      return prop.value;
  }
  return null;
}

/** SEC-010 dangerouslySetInnerHTML 에 살균되지 않은 값 */
export const sec010: Rule = {
  id: "SEC-010",
  title: "dangerouslySetInnerHTML 에 살균되지 않은 값",
  severity: "medium",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (
        !isJsFile(file.path) ||
        !file.content.includes("dangerouslySetInnerHTML")
      )
        continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      walk(ast.program, (node) => {
        if (
          node.type !== "JSXAttribute" ||
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "dangerouslySetInnerHTML"
        )
          return;
        const value = htmlValue(node.value);
        if (value && isSafeHtml(value)) return;
        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-010",
          severity: "medium",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
          reason:
            "dangerouslySetInnerHTML 에 들어가는 값이 살균 함수를 거치지 않음",
        });
      });
    }
    return candidates;
  },
};
