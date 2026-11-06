import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^http/, "ws");

// Next 의 인라인 부트스트랩 때문에 script 는 'unsafe-inline' 이 필요하다(nonce 를 쓰면 정적 렌더링이 꺼진다).
// 대신 외부 스크립트, 프레임 삽입, 외부 이미지, 폼 전송 대상을 막는다.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://*.ingest.sentry.io https://*.ingest.us.sentry.io${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' https://github.com ${supabase}`,
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 초대 토큰이 경로에 들어가므로 다른 사이트로 주소를 넘기지 않는다.
  { key: "Referrer-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// 소스맵 업로드는 SENTRY_AUTH_TOKEN 이 있을 때(배포 빌드)만 한다.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
