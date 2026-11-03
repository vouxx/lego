import type { Node } from "@babel/types";
import type { SourceFile } from "../types";
import { parseJs, topLevelDirectives } from "./js-ast";
import { isJsFile } from "../files";

// 함수 안에서 인증·서명 확인을 하는 흔한 호출. 없으면 후보로 올리고 LLM 이 주변 코드로 판단한다.
export const AUTH_MARKER =
  /\b(auth|getUser|getSession|getClaims|getServerSession|currentUser|requireUser|getCurrentUser|requireAuth|withAuth|verify\w*|constructEvent|validateRequest|checkAuth|isAuthenticated|session)\b/;

export const APP_ROUTE = /(^|\/)app\/(?:.+\/)?route\.[cm]?[jt]sx?$/;
export const PAGES_API = /(^|\/)pages\/api\/.+\.[cm]?[jt]sx?$/;
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type EndpointKind = "Route Handler" | "Server Action";

/** 외부에서 바로 호출할 수 있는 함수: Route Handler, pages/api 핸들러, Server Action */
export type Endpoint = {
  file: SourceFile;
  kind: EndpointKind;
  name: string;
  /** HTTP 메서드 이름이거나 Server Action 이면 쓰기 요청 */
  mutating: boolean;
  node: Node;
  /** 함수 본문 소스 */
  source: string;
};

function exportedFunctions(program: Node[]) {
  const fns: { name: string; node: Node }[] = [];
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

/** 파일에서 외부에 열린 함수를 찾는다. Route Handler 는 GET 도 포함한다. */
export function findEndpoints(file: SourceFile): Endpoint[] {
  if (!isJsFile(file.path)) return [];
  const isRoute = APP_ROUTE.test(file.path);
  const isPagesApi = PAGES_API.test(file.path);
  if (!isRoute && !isPagesApi && !file.content.includes("use server"))
    return [];

  const ast = parseJs(file.content);
  if (!ast) return [];
  const isActionFile = topLevelDirectives(ast).includes("use server");
  if (!isRoute && !isPagesApi && !isActionFile) return [];

  const endpoints: Endpoint[] = [];
  for (const fn of exportedFunctions(ast.program.body)) {
    if (isRoute && !/^(GET|HEAD|OPTIONS|POST|PUT|PATCH|DELETE)$/.test(fn.name))
      continue;
    if (isPagesApi && fn.name !== "default") continue;
    endpoints.push({
      file,
      kind: isActionFile ? "Server Action" : "Route Handler",
      name: fn.name,
      // pages/api 핸들러는 메서드를 안에서 나누므로 쓰기 요청으로 본다.
      mutating: isActionFile || isPagesApi || MUTATING.has(fn.name),
      node: fn.node,
      source: file.content.slice(fn.node.start ?? 0, fn.node.end ?? 0),
    });
  }
  return endpoints;
}
