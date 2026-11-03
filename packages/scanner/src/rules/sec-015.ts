import { isServerFile } from "../detectors/server-file";
import { isJsFile, lineAt } from "../files";
import type { Candidate, Rule } from "../types";

const GET_SESSION = /\.auth\s*\.getSession\(\s*\)/g;
// 같은 파일에서 서버가 토큰을 검증하는 호출. 있으면 getSession 은 보조로 쓴 것으로 본다.
const VERIFIED = /\.auth\s*\.(?:getUser|getClaims)\(/;

/** SEC-015 서버 코드에서 supabase.auth.getSession() 결과를 그대로 믿음 */
export const sec015: Rule = {
  id: "SEC-015",
  title: "서버에서 getSession() 결과를 그대로 믿음",
  severity: "high",
  detector: "regex",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const file of files) {
      if (!isJsFile(file.path) || !file.content.includes("getSession"))
        continue;
      if (!isServerFile(file.path, file.content)) continue;
      if (VERIFIED.test(file.content)) continue;
      for (const match of file.content.matchAll(GET_SESSION)) {
        const line = lineAt(file.content, match.index);
        candidates.push({
          ruleId: "SEC-015",
          severity: "high",
          filePath: file.path,
          lineStart: line,
          lineEnd: line,
          snippet: file.content.split("\n")[line - 1]?.trim() ?? "",
          reason:
            "서버 코드가 쿠키에서 읽은 세션(getSession)을 검증 없이 쓰고, 같은 파일에 getUser/getClaims 가 없음",
        });
      }
    }
    return candidates;
  },
};
