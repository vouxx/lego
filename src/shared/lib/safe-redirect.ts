/** 로그인 후 이동할 경로. 같은 사이트 안의 경로만 허용한다(open redirect 방지). */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/projects",
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\")) return fallback;
  return next;
}

/**
 * 로그인 후 이동할 경로를 OAuth 왕복 동안 담아 두는 쿠키.
 * Supabase redirect_to 에 쿼리를 붙이면 Redirect URLs 허용 목록과 정확히 맞지 않아
 * Site URL 로 떨어지므로, 콜백 주소는 쿼리 없이 두고 경로는 쿠키로 넘긴다.
 */
export const NEXT_PATH_COOKIE = "lego_next";
