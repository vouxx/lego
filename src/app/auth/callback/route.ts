import { NextResponse, type NextRequest } from "next/server";
import { completeGitHubSignIn } from "@/features/auth/services/session";
import { safeNextPath } from "@/shared/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url),
    );
  }

  const result = await completeGitHubSignIn(code);
  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/login?error=${result.error.code}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
