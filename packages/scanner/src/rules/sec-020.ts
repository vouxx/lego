import type { File, Node } from "@babel/types";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { calleeText, collectTaint, textOf } from "../detectors/taint";
import { isJsFile, isMinified } from "../files";
import type { Candidate, Rule } from "../types";

const SHELL_MODULE = /^(?:node:)?child_process$|^shelljs$|^execa$/;
// 문자열 전체를 셸이나 JS 로 실행하는 함수
const RUN_STRING = new Set([
  "exec",
  "execSync",
  "execaCommand",
  "execaCommandSync",
]);
// 프로그램과 인자를 나눠 받는 함수. 프로그램 이름이 입력이거나 shell: true 일 때만 위험하다.
const RUN_FILE = new Set([
  "spawn",
  "spawnSync",
  "execFile",
  "execFileSync",
  "fork",
  "execa",
  "execaSync",
]);
const EVAL_CALL =
  /^(?:eval|Function|vm\.(?:runInNewContext|runInThisContext|runInContext|compileFunction)|vm\.Script)$/;

/** child_process 등에서 가져온 이름: 함수 이름 → 원래 이름, 모듈 객체 이름 */
function shellImports(ast: File) {
  const fns = new Map<string, string>();
  const modules = new Set<string>();
  walk(ast.program, (node) => {
    if (
      node.type === "ImportDeclaration" &&
      SHELL_MODULE.test(node.source.value)
    ) {
      for (const s of node.specifiers) {
        if (s.type === "ImportSpecifier")
          fns.set(
            s.local.name,
            s.imported.type === "Identifier"
              ? s.imported.name
              : s.imported.value,
          );
        else modules.add(s.local.name);
      }
    }
    if (
      node.type === "VariableDeclarator" &&
      node.init?.type === "CallExpression" &&
      calleeText(node.init.callee) === "require" &&
      node.init.arguments[0]?.type === "StringLiteral" &&
      SHELL_MODULE.test(node.init.arguments[0].value)
    ) {
      if (node.id.type === "Identifier") modules.add(node.id.name);
      if (node.id.type === "ObjectPattern")
        for (const p of node.id.properties)
          if (
            p.type === "ObjectProperty" &&
            p.key.type === "Identifier" &&
            p.value.type === "Identifier"
          )
            fns.set(p.value.name, p.key.name);
    }
  });
  return { fns, modules };
}

/** SEC-020 사용자 입력으로 명령 실행·eval */
export const sec020: Rule = {
  id: "SEC-020",
  title: "사용자 입력으로 명령 실행·eval",
  severity: "critical",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path) || isMinified(file.content)) continue;
      if (
        !/child_process|shelljs|execa|\beval\(|\bFunction\(|\bvm\./.test(
          file.content,
        )
      )
        continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      const taint = collectTaint(ast, file.content);
      const { fns, modules } = shellImports(ast);
      const tainted = (n: Node | undefined) =>
        !!n && taint.test(textOf(n, file.content));

      const push = (node: Node, reason: string) => {
        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-020",
          severity: "critical",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
          reason,
        });
      };

      walk(ast.program, (node) => {
        if (node.type !== "CallExpression" && node.type !== "NewExpression")
          return;
        const name = calleeText(node.callee);
        const args = node.arguments as Node[];
        if (EVAL_CALL.test(name)) {
          if (args.some(tainted))
            push(
              node,
              `${name} 에 요청 값이 들어가 임의 코드가 실행될 수 있음`,
            );
          return;
        }
        if (node.type !== "CallExpression") return;
        // exec(...) 처럼 가져온 함수, cp.exec(...) 처럼 모듈 객체의 함수
        let fn: string | undefined;
        if (node.callee.type === "Identifier") fn = fns.get(node.callee.name);
        else if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.type === "Identifier" &&
          modules.has(node.callee.object.name) &&
          node.callee.property.type === "Identifier"
        )
          fn = node.callee.property.name;
        if (!fn) return;
        const shell = /\bshell\s*:\s*true\b/.test(textOf(node, file.content));
        if (
          (RUN_STRING.has(fn) && tainted(args[0])) ||
          (RUN_FILE.has(fn) &&
            (tainted(args[0]) || (shell && args.some(tainted))))
        )
          push(
            node,
            `${fn} 로 실행하는 명령에 요청 값이 들어가 다른 명령을 끼워 넣을 수 있음`,
          );
      });
    }
    return candidates;
  },
};
