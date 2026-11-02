import { isEnvFile, isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

const PUBLIC_PREFIX = String.raw`(?:NEXT_PUBLIC_|VITE_|EXPO_PUBLIC_|REACT_APP_|PUBLIC_)`;
const SECRET_WORD = String.raw`(?:SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|OPENAI|ANTHROPIC|SK_LIVE|STRIPE_SECRET|DATABASE_URL|DB_URL)`;
const PATTERN = new RegExp(
  String.raw`\b${PUBLIC_PREFIX}[A-Z0-9_]*${SECRET_WORD}[A-Z0-9_]*\b`,
  "g",
);

/** SEC-003 클라이언트 번들에 노출되는 접두사가 붙은 비밀 키 */
export const sec003: Rule = {
  id: "SEC-003",
  title: "NEXT_PUBLIC_ / VITE_ 접두사가 붙은 비밀 키",
  severity: "critical",
  detector: "regex",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (
        !isJsFile(file.path) &&
        !isEnvFile(file.path) &&
        !/\.env\./.test(file.path)
      )
        continue;
      file.content.split("\n").forEach((line, index) => {
        const names = new Set([...line.matchAll(PATTERN)].map((m) => m[0]));
        for (const name of names) {
          if (/PUBLISHABLE|ANON/.test(name)) continue;
          candidates.push({
            ruleId: "SEC-003",
            severity: "critical",
            filePath: file.path,
            lineStart: index + 1,
            lineEnd: index + 1,
            snippet: line.trim(),
            reason: `${name}: 클라이언트 번들에 포함되는 이름에 비밀 키로 보이는 단어가 있음`,
          });
        }
      });
    }
    return candidates;
  },
};
