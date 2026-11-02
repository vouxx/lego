import {
  lineRange,
  parseJs,
  topLevelDirectives,
  walk,
} from "../detectors/js-ast";
import { isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

const SERVICE_ROLE = /service_role|SERVICE_ROLE|SUPABASE_SECRET|sb_secret_/;

/** SEC-004 Supabase service_role 키를 클라이언트 코드에서 사용 */
export const sec004: Rule = {
  id: "SEC-004",
  title: "Supabase service_role 키를 클라이언트 코드에서 사용",
  severity: "critical",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path) || !SERVICE_ROLE.test(file.content)) continue;
      const ast = parseJs(file.content);
      if (!ast || !topLevelDirectives(ast).includes("use client")) continue;

      const seen = new Set<number>();
      walk(ast, (node) => {
        let text: string | null = null;
        if (node.type === "Identifier") text = node.name;
        else if (node.type === "StringLiteral") text = node.value;
        else if (node.type === "TemplateElement") text = node.value.raw;
        if (!text || !SERVICE_ROLE.test(text)) return;

        const { lineStart } = lineRange(node);
        if (seen.has(lineStart)) return;
        seen.add(lineStart);
        candidates.push({
          ruleId: "SEC-004",
          severity: "critical",
          filePath: file.path,
          lineStart,
          lineEnd: lineStart,
          snippet: file.content.split("\n")[lineStart - 1]?.trim() ?? text,
          reason: '"use client" 파일에서 service_role/secret 키를 참조',
        });
      });
    }
    return candidates;
  },
};
