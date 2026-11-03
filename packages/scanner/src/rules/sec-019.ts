import { lineRange, parseJs, walk } from "../detectors/js-ast";
import { isClientFile } from "../detectors/server-file";
import { calleeText, collectTaint, textOf } from "../detectors/taint";
import { isJsFile, isMinified } from "../files";
import type { Candidate, Rule } from "../types";

const FS_IMPORT =
  /["'](?:node:)?fs(?:\/promises)?["']|\bsendFile\b|\bres\.download\b/;
const FS_CALL =
  /^(?:(?:fs|fsp|fsPromises|promises|fs\.promises)\.)?(?:readFile|readFileSync|createReadStream|writeFile|writeFileSync|createWriteStream|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync|readdir|readdirSync|copyFile|copyFileSync|open|openSync)$|^res\.(?:sendFile|download)$/;
// 경로를 검사·정리하는 흔한 모양. 있으면 후보에서 뺀다.
const SAFE_PATH =
  /\bbasename\(|\.startsWith\(\s*[\w.]*(?:root|base|dir|ROOT|BASE|DIR)\w*\s*\)|\.includes\(\s*["'`]\.\.["'`]|isSafe\w*|safe\w*Path|sanitize\w*(?:Path|File|Name)|\/\^\[[^\]]*\]\+\$\/\.test\(/i;

/** SEC-019 사용자 입력이 들어간 파일 경로 (경로 조작) */
export const sec019: Rule = {
  id: "SEC-019",
  title: "사용자 입력이 들어간 파일 경로 (경로 조작)",
  severity: "high",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (
        !isJsFile(file.path) ||
        isMinified(file.content) ||
        isClientFile(file.content)
      )
        continue;
      if (!FS_IMPORT.test(file.content) || SAFE_PATH.test(file.content))
        continue;
      const ast = parseJs(file.content);
      if (!ast) continue;
      const taint = collectTaint(ast, file.content);

      walk(ast.program, (node) => {
        if (node.type !== "CallExpression") return;
        const name = calleeText(node.callee);
        const first = node.arguments[0];
        if (!FS_CALL.test(name) || !first) return;
        if (!taint.test(textOf(first, file.content))) return;
        const { lineStart, lineEnd } = lineRange(node);
        candidates.push({
          ruleId: "SEC-019",
          severity: "high",
          filePath: file.path,
          lineStart,
          lineEnd,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? "",
          reason: `${name} 의 파일 경로에 요청 값이 들어가고, ../ 를 막는 검사가 보이지 않음`,
        });
      });
    }
    return candidates;
  },
};
