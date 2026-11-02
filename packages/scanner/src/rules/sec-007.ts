import type { Node } from "@babel/types";
import { lineRange, parseJs, topLevelDirectives } from "../detectors/js-ast";
import { isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

const APP_ROUTE = /(^|\/)app\/(?:.+\/)?route\.[cm]?[jt]sx?$/;
const PAGES_API = /(^|\/)pages\/api\/.+\.[cm]?[jt]sx?$/;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// 함수 안에서 인증·서명 확인을 하는 흔한 호출. 없으면 후보로 올리고 LLM 이 주변 코드로 판단한다.
const AUTH_MARKER =
  /\b(auth|getUser|getSession|getClaims|getServerSession|currentUser|requireUser|getCurrentUser|requireAuth|withAuth|verify\w*|constructEvent|validateRequest|checkAuth|isAuthenticated|session)\b/;

type ExportedFn = { name: string; node: Node };

function exportedFunctions(program: Node[]): ExportedFn[] {
  const fns: ExportedFn[] = [];
  for (const stmt of program) {
    if (stmt.type === "ExportDefaultDeclaration") {
      const d = stmt.declaration;
      if (
        d.type === "FunctionDeclaration" ||
        d.type === "ArrowFunctionExpression" ||
        d.type === "FunctionExpression"
      ) {
        fns.push({ name: "default", node: d });
      }
    }
    if (stmt.type !== "ExportNamedDeclaration" || !stmt.declaration) continue;
    const d = stmt.declaration;
    if (d.type === "FunctionDeclaration" && d.id)
      fns.push({ name: d.id.name, node: d });
    if (d.type === "VariableDeclaration") {
      for (const v of d.declarations) {
        if (
          v.id.type === "Identifier" &&
          (v.init?.type === "ArrowFunctionExpression" ||
            v.init?.type === "FunctionExpression")
        ) {
          fns.push({ name: v.id.name, node: v.init });
        }
      }
    }
  }
  return fns;
}

/** SEC-007 인증 확인 없는 Route Handler / Server Action */
export const sec007: Rule = {
  id: "SEC-007",
  title: "인증 확인 없는 Route Handler / Server Action",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path)) continue;
      const isRoute = APP_ROUTE.test(file.path);
      const isPagesApi = PAGES_API.test(file.path);
      const mightBeAction = file.content.includes("use server");
      if (!isRoute && !isPagesApi && !mightBeAction) continue;

      const ast = parseJs(file.content);
      if (!ast) continue;
      const isActionFile = topLevelDirectives(ast).includes("use server");
      if (!isRoute && !isPagesApi && !isActionFile) continue;

      for (const fn of exportedFunctions(ast.program.body)) {
        if (isRoute && !MUTATING.has(fn.name)) continue;
        if (isPagesApi && fn.name !== "default") continue;

        const source = file.content.slice(fn.node.start ?? 0, fn.node.end ?? 0);
        if (AUTH_MARKER.test(source)) continue;

        const { lineStart, lineEnd } = lineRange(fn.node);
        const kind = isActionFile ? "Server Action" : "Route Handler";
        candidates.push({
          ruleId: "SEC-007",
          severity: "high",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? fn.name,
          reason: `${kind} ${fn.name} 안에서 인증 확인 호출을 찾지 못함`,
        });
      }
    }
    return candidates;
  },
};
