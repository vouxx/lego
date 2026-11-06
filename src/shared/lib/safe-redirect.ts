/** 로그인 후 이동할 경로. 같은 사이트 안의 경로만 허용한다(open redirect 방지). */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/projects",
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  // URL 파서는 탭·줄바꿈을 지우고 \ 를 / 로 읽는다. "/\t/evil.com" 은 //evil.com 이 된다.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "https://lego.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

/**
 * 로그인 후 이동할 경로를 OAuth 왕복 동안 담아 두는 쿠키.
 * Supabase redirect_to 에 쿼리를 붙이면 Redirect URLs 허용 목록과 정확히 맞지 않아
 * Site URL 로 떨어지므로, 콜백 주소는 쿼리 없이 두고 경로는 쿠키로 넘긴다.
 */
export const NEXT_PATH_COOKIE = "lego_next";
