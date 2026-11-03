/** 같은 사이트 안의 경로만 허용한다. "//evil.com", "/\evil.com" 은 막는다. */
export function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}
