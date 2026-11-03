import { NextResponse, type NextRequest } from "next/server";
import {
  linkInstallation,
  syncInstallations,
} from "@/features/projects/services/installations";
import { getCurrentUser } from "@/lib/auth";

// 새로 설치: ?code=…&installation_id=…&setup_action=install
// 설치 불러오기(사용자 인증만): ?code=…
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const back = (query: string) =>
    NextResponse.redirect(new URL(`/projects/new?${query}`, request.url));

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/projects/new", request.url),
    );
  }

  // 조직 관리자 승인이 필요한 경우: 설치가 아직 생기지 않았다.
  if (searchParams.get("setup_action") === "request") {
    return back("notice=install_requested");
  }

  const code = searchParams.get("code");
  if (!code) return back("error=install_missing_params");

  const rawInstallationId = searchParams.get("installation_id");
  if (rawInstallationId === null) {
    const result = await syncInstallations(user, code);
    if (!result.ok) return back(`error=${result.error.code}`);
    return back("notice=synced");
  }

  const installationId = Number(rawInstallationId);
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    return back("error=install_missing_params");
  }
  const result = await linkInstallation(user, code, installationId);
  if (!result.ok) return back(`error=${result.error.code}`);
  return back("notice=installed");
}
