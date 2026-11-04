import { NextResponse, type NextRequest } from "next/server";
import {
  STATE_COOKIE,
  finishSlackConnect,
} from "@/features/notifications/services/connect";
import { getCurrentUser } from "@/lib/auth";

/** Slack 허용 화면에서 돌아오는 곳. 결과는 프로젝트 화면의 ?slack= 로 알린다. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  const cookie = request.cookies.get(STATE_COOKIE)?.value;
  const projectId = cookie?.split(".")[1];
  const back = (status: string, id = projectId) =>
    NextResponse.redirect(
      new URL(
        id && /^[0-9a-f-]{36}$/.test(id)
          ? `/projects/${id}?slack=${status}`
          : "/projects",
        request.url,
      ),
    );

  // 사용자가 Slack 화면에서 취소했다.
  if (params.get("error")) return clear(back("cancelled"));
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return clear(back("invalid_state"));

  const result = await finishSlackConnect({
    user,
    code,
    state,
    cookie,
    redirectUri: new URL("/api/slack/oauth/callback", request.url).toString(),
  });
  return clear(
    result.ok
      ? back("connected", result.data.projectId)
      : back(result.error.code),
  );
}

function clear(res: NextResponse) {
  res.cookies.set(STATE_COOKIE, "", { path: "/api/slack", maxAge: 0 });
  return res;
}
