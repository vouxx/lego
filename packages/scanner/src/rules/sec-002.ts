import { isEnvFile, isEnvTemplate, isJsFile } from "../files";
import type { Candidate, Rule } from "../types";

const ENV_IGNORE_LINE =
  /^\s*(?:\/|\*\*\/)?\.env(?:\*|\.\*|\.local)?\s*$|^\s*\*\.env\s*$/;

/** SEC-002 .env 파일이 커밋됨 / .gitignore 에 누락 */
export const sec002: Rule = {
  id: "SEC-002",
  title: ".env 파일이 커밋됨 / .gitignore 에 누락",
  severity: "critical",
  detector: "file-tree",
  detect: ({ files, paths }) => {
    const candidates: Candidate[] = paths.filter(isEnvFile).map((path) => ({
      ruleId: "SEC-002",
      severity: "critical",
      filePath: path,
      lineStart: 1,
      lineEnd: 1,
      snippet: path,
      reason: "환경 변수 파일이 리포에 커밋됨",
    }));

    // 환경 변수를 쓰는 프로젝트인데 루트 .gitignore 에 .env 규칙이 없으면 다음 커밋에 올라갈 수 있다.
    const usesEnv =
      paths.some(isEnvTemplate) ||
      files.some(
        (f) =>
          isJsFile(f.path) &&
          /process\.env\.|import\.meta\.env\./.test(f.content),
      );
    const gitignore = files.find((f) => f.path === ".gitignore");
    const ignoresEnv = gitignore?.content
      .split("\n")
      .some((line) => ENV_IGNORE_LINE.test(line));

    if (usesEnv && !ignoresEnv) {
      candidates.push({
        ruleId: "SEC-002",
        severity: "critical",
        filePath: ".gitignore",
        lineStart: 1,
        lineEnd: 1,
        snippet: gitignore
          ? (gitignore.content.split("\n")[0] ?? "")
          : "(.gitignore 없음)",
        reason: gitignore
          ? ".gitignore 에 .env 규칙이 없음"
          : "루트에 .gitignore 가 없음",
      });
    }
    return candidates;
  },
};
