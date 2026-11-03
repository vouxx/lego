import type { Node } from "@babel/types";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { calleeText, collectTaint, controlsTarget } from "../detectors/taint";
import { isJsFile, isMinified } from "../files";
import type { Candidate, Rule } from "../types";

const REDIRECT_CALL =
  /^(?:redirect|permanentRedirect|NextResponse\.redirect|Response\.redirect|res\.redirect|reply\.redirect|router\.(?:push|replace)|(?:window\.)?location\.(?:assign|replace))$/;
const LOCATION_TARGET = /^(?:window\.)?location(?:\.href)?$/;
// 이동할 주소를 검사하는 흔한 모양. 있으면 후보에서 뺀다.
const SAFE_REDIRECT =
  /startsWith\(\s*["'`]\/["'`]|safe\w*(?:path|url|redirect|next|return)|isSafe\w*|isRelative\w*|isInternal\w*|allowed\w*|ALLOWED_\w*|allowlist|whitelist|\.origin\s*[!=]==|[!=]==\s*[\w.]*\.origin\b/i;
const HINT = /redirect|location|router\.(?:push|replace)/;

/** SEC-017 요청 값으로 바로 이동하는 열린 리다이렉트 */
export const sec017: Rule = {
  id: "SEC-017",
  title: "요청 값으로 바로 이동하는 열린 리다이렉트",
  severity: "medium",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (
        !isJsFile(file.path) ||
        isMinified(file.content) ||
        !HINT.test(file.content)
      )
        continue;
      if (SAFE_REDIRECT.test(file.content)) continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      const taint = collectTaint(ast, file.content);

      const check = (node: Node, target: Node | undefined, what: string) => {
        if (!target || target.type === "SpreadElement") return;
        if (!controlsTarget(target, file.content, taint)) return;
        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-017",
          severity: "medium",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
          reason: `${what} 의 이동 주소를 요청 값(쿼리·폼·본문)이 정하고, 같은 사이트 주소인지 검사하지 않음`,
        });
      };

      walk(ast.program, (node) => {
        if (node.type === "CallExpression") {
          const name = calleeText(node.callee);
          if (REDIRECT_CALL.test(name))
            check(node, node.arguments[0] as Node | undefined, name);
        }
        if (
          node.type === "AssignmentExpression" &&
          LOCATION_TARGET.test(calleeText(node.left))
        )
          check(node, node.right, calleeText(node.left));
      });
    }
    return candidates;
  },
};
