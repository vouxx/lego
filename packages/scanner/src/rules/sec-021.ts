import type { Node } from "@babel/types";
import { findEndpoints } from "../detectors/endpoints";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import {
  calleeText,
  collectTaint,
  textOf,
  type Taint,
} from "../detectors/taint";
import { isMinified } from "../files";
import type { Candidate, Rule } from "../types";

// 스키마 검증·필드 고르기를 거친 값은 통째 입력으로 보지 않는다(Zod object 는 모르는 키를 버린다).
const VALIDATED =
  /\.(?:safe)?[pP]arse(?:Async)?\(|\bvalidate\w*\(|\bpick\(|\bomit\(/;
// 저장 호출: Supabase, Drizzle, Mongoose 는 첫 인자, Prisma 는 data
const SUPABASE_WRITE = /\.from\.(?:insert|update|upsert)$/;
const DRIZZLE_WRITE = /\.(?:insert\.values|update\.set)$/;
const PRISMA_WRITE =
  /^(?:prisma|db|tx|ctx\.db|ctx\.prisma)\.\w+\.(?:create|update|upsert|createMany|updateMany)$/;
const MONGOOSE_WRITE =
  /^[A-Z]\w*\.(?:create|insertMany|findByIdAndUpdate|findOneAndUpdate|updateOne|updateMany)$/;
const DIRECT_BODY =
  /^(?:await\s+)?(?:req|request)\.(?:json\(\)|body)$|^Object\.fromEntries\(/;

/** 요청으로 받은 객체를 그대로(또는 펼쳐서) 넘기는지 */
function isWholeInput(value: Node, content: string, taint: Taint): boolean {
  const text = textOf(value, content).trim();
  if (DIRECT_BODY.test(text)) return true;
  if (value.type === "Identifier") return taint.names.has(value.name);
  if (value.type === "TSAsExpression")
    return isWholeInput(value.expression, content, taint);
  if (value.type === "ObjectExpression")
    return value.properties.some(
      (p) =>
        p.type === "SpreadElement" && isWholeInput(p.argument, content, taint),
    );
  if (value.type === "ArrayExpression")
    return value.elements.some(
      (e) =>
        !!e && e.type !== "SpreadElement" && isWholeInput(e, content, taint),
    );
  return false;
}

function writeValue(name: string, args: Node[]): Node | undefined {
  if (SUPABASE_WRITE.test(name) || DRIZZLE_WRITE.test(name)) return args[0];
  if (MONGOOSE_WRITE.test(name))
    return /\.(?:create|insertMany)$/.test(name) ? args[0] : args[1];
  if (PRISMA_WRITE.test(name) && args[0]?.type === "ObjectExpression") {
    for (const p of args[0].properties)
      if (
        p.type === "ObjectProperty" &&
        p.key.type === "Identifier" &&
        p.key.name === "data"
      )
        return p.value as Node;
  }
  return undefined;
}

/** SEC-021 요청 값을 통째로 저장 (Mass Assignment) */
export const sec021: Rule = {
  id: "SEC-021",
  title: "요청 값을 통째로 저장 (Mass Assignment)",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (isMinified(file.content)) continue;
      const endpoints = findEndpoints(file).filter((e) => e.mutating);
      if (endpoints.length === 0) continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      const taint = collectTaint(ast, file.content, {
        stop: VALIDATED,
        skipPrimitiveParams: true,
      });
      for (const endpoint of endpoints) {
        walk(endpoint.node, (node) => {
          if (node.type !== "CallExpression") return;
          const name = calleeText(node.callee);
          const value = writeValue(name, node.arguments as Node[]);
          if (!value || !isWholeInput(value, file.content, taint)) return;
          const { lineStart, lineEnd } = lineRange(node);
          candidates.push({
            ruleId: "SEC-021",
            severity: "high",
            filePath: file.path,
            lineStart,
            lineEnd,
            snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
            reason: `${endpoint.kind} ${endpoint.name} 가 요청으로 받은 객체를 필드를 고르지 않고 ${name.split(".").pop()} 에 그대로 넘김 (role·user_id 같은 필드도 바꿀 수 있음)`,
          });
        });
      }
    }
    return candidates;
  },
};
