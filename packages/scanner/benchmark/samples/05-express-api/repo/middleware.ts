import { NextResponse, type NextRequest } from "next/server";

// app 라우터 쪽 /api/v2 에도 같은 CORS 를 건다
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", req.headers.get("origin") ?? "*");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Vary", "Origin");
  return res;
}

export const config = {
  matcher: "/api/v2/:path*",
};
