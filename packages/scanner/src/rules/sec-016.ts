import { AUTH_MARKER, findEndpoints } from "../detectors/endpoints";
import { isClientFile, MIDDLEWARE_FILE } from "../detectors/server-file";
import { isJsFile, lineAt } from "../files";
import type { Candidate, Rule, SourceFile } from "../types";

// 미들웨어가 로그인을 확인하는 흔한 모양
const MIDDLEWARE_AUTH =
  /getUser|getSession|getClaims|getToken|\bauth\(|withAuth|clerkMiddleware|authMiddleware|jwtVerify|verify\w*\(/;
const MIDDLEWARE_BLOCK = /redirect\(|rewrite\(|status:\s*40[13]|\b40[13]\b/;
// 데이터를 읽는 흔한 호출
const DATA_ACCESS =
  /\.from\(\s*["'`]\w|\bprisma\.\w+\.(?:find|count|aggregate|group)|\bdb\.(?:select|query)\b|\bsql`|\.query\(\s*["'`]|\.collection\(\s*["'`]/;
const APP_PAGE = /(^|\/)app\/((?:.+\/)?)page\.[cm]?[jt]sx?$/;
const APP_ROUTE_DIR = /(^|\/)app\/((?:.+\/)?)route\.[cm]?[jt]sx?$/;

/** app/(group)/dashboard/[id]/ → /dashboard/[id] */
function routePath(dir: string) {
  const segments = dir
    .split("/")
    .filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("@"));
  return `/${segments.join("/")}`;
}

/** 미들웨어가 지키는 경로. matcher 가 거의 모든 경로를 잡으면 "*" */
function protectedPrefixes(middleware: SourceFile) {
  const prefixes: string[] = [];
  for (const m of middleware.content.matchAll(/["'`](\/[^"'`\s]*)["'`]/g)) {
    const raw = m[1]!;
    if (raw.includes("(?!") || raw === "/(.*)" || raw === "/:path*")
      return ["*"];
    const prefix = raw.replace(/\/?(?::\w+[*+?]?|\(.*\)).*$/, "");
    if (
      prefix.length > 1 &&
      !/login|sign-?in|sign-?up|auth|callback|public|_next|favicon/i.test(
        prefix,
      )
    )
      prefixes.push(prefix);
  }
  return prefixes;
}

const isUnder = (path: string, prefixes: string[]) =>
  prefixes.includes("*") ||
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/** SEC-016 미들웨어에서만 로그인을 확인하고 페이지·라우트 안에서는 확인하지 않음 */
export const sec016: Rule = {
  id: "SEC-016",
  title: "미들웨어에서만 로그인 확인",
  severity: "medium",
  detector: "llm",
  detect: ({ files }) => {
    const middleware = files.find(
      (f) =>
        MIDDLEWARE_FILE.test(f.path) &&
        MIDDLEWARE_AUTH.test(f.content) &&
        MIDDLEWARE_BLOCK.test(f.content),
    );
    if (!middleware) return [];
    const prefixes = protectedPrefixes(middleware);
    if (prefixes.length === 0) return [];

    const candidates: Candidate[] = [];
    const push = (file: SourceFile, offset: number, what: string) => {
      const line = lineAt(file.content, offset);
      candidates.push({
        ruleId: "SEC-016",
        severity: "medium",
        filePath: file.path,
        lineStart: line,
        lineEnd: line,
        snippet: file.content.split("\n")[line - 1]?.trim() ?? "",
        reason: `${middleware.path} 가 로그인을 확인하지만 ${what} 안에서는 다시 확인하지 않고 데이터를 읽음 (미들웨어는 우회되거나 matcher 에서 빠질 수 있음)`,
      });
    };

    for (const file of files) {
      if (!isJsFile(file.path) || isClientFile(file.content)) continue;
      const page = file.path.match(APP_PAGE);
      if (page && isUnder(routePath(page[2]!), prefixes)) {
        const data = DATA_ACCESS.exec(file.content);
        if (data && !AUTH_MARKER.test(file.content))
          push(file, data.index, `페이지 ${routePath(page[2]!)}`);
        continue;
      }
      const route = file.path.match(APP_ROUTE_DIR);
      if (!route || !isUnder(routePath(route[2]!), prefixes)) continue;
      for (const endpoint of findEndpoints(file)) {
        // 쓰기 요청은 SEC-007 이 본다.
        if (endpoint.mutating || AUTH_MARKER.test(endpoint.source)) continue;
        const data = DATA_ACCESS.exec(endpoint.source);
        if (!data) continue;
        push(
          file,
          (endpoint.node.start ?? 0) + data.index,
          `${endpoint.name} ${routePath(route[2]!)}`,
        );
      }
    }
    return candidates;
  },
};
