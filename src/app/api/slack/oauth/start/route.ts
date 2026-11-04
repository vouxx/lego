import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  STATE_COOKIE,
  startSlackConnect,
} from "@/features/notifications/services/connect";
import { getCurrentUser } from "@/lib/auth";

/** 프로젝트 화면의 "Slack 에 추가" → Slack 허용 화면으로 보낸다. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const projectId = z
    .uuid()
    .safeParse(request.nextUrl.searchParams.get("projectId"));
  if (!projectId.success)
    return NextResponse.json({ error: "invalid_project" }, { status: 400 });

  const redirectUri = new URL(
    "/api/slack/oauth/callback",
    request.url,
  ).toString();
  const result = await startSlackConnect(projectId.data, redirectUri);
  if (!result.ok)
    return NextResponse.redirect(
      new URL(
        `/projects/${projectId.data}?slack=${result.error.code}`,
        request.url,
      ),
    );

  const res = NextResponse.redirect(result.data.url);
  res.cookies.set(STATE_COOKIE, result.data.cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/slack",
    maxAge: 600,
  });
  return res;
}
