import { NextResponse, type NextRequest } from "next/server";
import { completeGitHubSignIn } from "@/features/auth/services/session";
import { NEXT_PATH_COOKIE, safeNextPath } from "@/shared/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.cookies.get(NEXT_PATH_COOKIE)?.value);

  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.delete({ name: NEXT_PATH_COOKIE, path: "/auth/callback" });
    return response;
  };

  if (!code) return redirectTo("/login?error=missing_code");

  const result = await completeGitHubSignIn(code);
  if (!result.ok) return redirectTo(`/login?error=${result.error.code}`);

  return redirectTo(next);
}
