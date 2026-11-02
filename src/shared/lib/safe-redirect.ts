/** 로그인 후 이동할 경로. 같은 사이트 안의 경로만 허용한다(open redirect 방지). */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/projects",
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}
