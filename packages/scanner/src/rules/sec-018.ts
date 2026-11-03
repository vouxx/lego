import type { Node } from "@babel/types";
import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { isClientFile } from "../detectors/server-file";
import { calleeText, collectTaint, controlsTarget } from "../detectors/taint";
import { isJsFile, isMinified } from "../files";
import type { Candidate, Rule } from "../types";

const HTTP_CALL =
  /^(?:fetch|\$fetch|ofetch|axios(?:\.(?:get|post|put|patch|delete|head|request))?|got(?:\.\w+)?|ky(?:\.\w+)?|needle|request|https?\.(?:get|request)|undici\.(?:request|fetch)|superagent\.\w+)$/;
// 요청을 보낼 주소를 검사하는 흔한 모양. 있으면 후보에서 뺀다.
const SAFE_HOST =
  /ALLOWED_\w*|allowlist|whitelist|allowedHosts?|allowedDomains?|isAllowed\w*|\.hostname\s*(?:[!=]==|\)|\bin\b)|\.host\s*[!=]==|isPrivate\w*|private\w*Ip|ssrf/i;

function urlArgument(args: Node[]) {
  const first = args[0];
  if (first?.type !== "ObjectExpression") return first;
  // axios({ url }) 모양
  for (const prop of first.properties) {
    if (
      prop.type === "ObjectProperty" &&
      prop.key.type === "Identifier" &&
      (prop.key.name === "url" || prop.key.name === "baseURL")
    )
      return prop.value as Node;
  }
  return undefined;
}

/** SEC-018 사용자가 준 URL 로 서버가 요청 (SSRF) */
export const sec018: Rule = {
  id: "SEC-018",
  title: "사용자가 준 URL 로 서버가 요청 (SSRF)",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      // 브라우저에서 보내는 요청은 서버 내부망에 닿지 않는다.
      if (
        !isJsFile(file.path) ||
        isMinified(file.content) ||
        isClientFile(file.content)
      )
        continue;
      if (SAFE_HOST.test(file.content)) continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      const taint = collectTaint(ast, file.content);
      if (
        taint.names.size === 0 &&
        !/req\.|request\.url|searchParams/.test(file.content)
      )
        continue;

      walk(ast.program, (node) => {
        if (node.type !== "CallExpression") return;
        const name = calleeText(node.callee);
        if (!HTTP_CALL.test(name)) return;
        const target = urlArgument(node.arguments as Node[]);
        if (!target || !controlsTarget(target, file.content, taint)) return;
        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-018",
          severity: "high",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
          reason: `서버의 ${name} 가 요청 값으로 받은 주소로 요청하고, 허용 도메인을 검사하지 않음`,
        });
      });
    }
    return candidates;
  },
};
