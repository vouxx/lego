import { APP_ROUTE, PAGES_API } from "./endpoints";

export const MIDDLEWARE_FILE =
  /(^|\/)(?:src\/)?(?:middleware|proxy)\.[cm]?[jt]s$/;
const APP_SERVER_FILE =
  /(^|\/)app\/(?:.+\/)?(?:page|layout|template|default)\.[cm]?[jt]sx?$/;
const SERVER_MARKER =
  /["']use server["']|["']server-only["']|["']next\/headers["']|createServerClient|getServerSideProps/;
const USE_CLIENT =
  /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*["']use client["']/;

export const isClientFile = (content: string) => USE_CLIENT.test(content);

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
