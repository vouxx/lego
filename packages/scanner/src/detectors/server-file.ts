import { APP_ROUTE, PAGES_API } from "./endpoints";

export const MIDDLEWARE_FILE =
  /(^|\/)(?:src\/)?(?:middleware|proxy)\.[cm]?[jt]s$/;
const APP_SERVER_FILE =
  /(^|\/)app\/(?:.+\/)?(?:page|layout|template|default)\.[cm]?[jt]sx?$/;
const SERVER_MARKER =
  /["']use server["']|["']server-only["']|["']next\/headers["']|createServerClient|getServerSideProps/;
/**
 * 파일 맨 앞의 공백·주석을 건너뛰고 "use client" 인지 본다.
 * 리포 내용은 공격자가 쓸 수 있으므로 정규식 대신 한 번만 훑는다(ReDoS 방지).
 */
export function isClientFile(content: string) {
  let i = 0;
  for (;;) {
    while (i < content.length && /\s/.test(content[i]!)) i++;
    if (content.startsWith("//", i)) {
      const end = content.indexOf("\n", i);
      if (end === -1) return false;
      i = end + 1;
    } else if (content.startsWith("/*", i)) {
      const end = content.indexOf("*/", i + 2);
      if (end === -1) return false;
      i = end + 2;
    } else break;
  }
  return /^["']use client["']/.test(content.slice(i, i + 12));
}

/** 서버에서만 도는 게 분명한 파일: 라우트, 미들웨어, 서버 컴포넌트 페이지, server-only 모듈 */
export function isServerFile(path: string, content: string) {
  if (isClientFile(content)) return false;
  return (
    APP_ROUTE.test(path) ||
    PAGES_API.test(path) ||
    MIDDLEWARE_FILE.test(path) ||
    APP_SERVER_FILE.test(path) ||
    SERVER_MARKER.test(content)
  );
}
