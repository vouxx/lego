import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabase.replace(/^http/, "ws");

// 포트폴리오 사이트가 공개 페이지(랜딩·개념 사전)를 iframe 으로 미리 보여 준다.
// 로그인 뒤 화면은 클릭재킹을 막기 위해 어디에도 넣을 수 없게 한다.
const EMBED_ORIGINS = ["https://vouxx-resume.vercel.app"];

// Next 의 인라인 부트스트랩 때문에 script 는 'unsafe-inline' 이 필요하다(nonce 를 쓰면 정적 렌더링이 꺼진다).
// 대신 외부 스크립트, 프레임 삽입, 외부 이미지, 폼 전송 대상을 막는다.
const csp = (frameAncestors: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${supabaseWs} https://*.ingest.sentry.io https://*.ingest.us.sentry.io${isDev ? " ws:" : ""}`,
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    `form-action 'self' https://github.com ${supabase}`,
    "object-src 'none'",
  ].join("; ");

const COMMON_HEADERS = [
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

const PRIVATE_HEADERS = [
  ...COMMON_HEADERS,
  { key: "Content-Security-Policy", value: csp("'none'") },
  { key: "X-Frame-Options", value: "DENY" },
];

// X-Frame-Options 는 허용할 출처를 고를 수 없어 공개 페이지에는 붙이지 않고 CSP frame-ancestors 로만 정한다.
const EMBEDDABLE_HEADERS = [
  ...COMMON_HEADERS,
  {
    key: "Content-Security-Policy",
    value: csp(["'self'", ...EMBED_ORIGINS].join(" ")),
  },
];

const nextConfig: NextConfig = {
  headers: async () => [
    // 공개 페이지가 아닌 모든 주소. "/" 와 "/concepts…" 만 빠진다.
    {
      source: "/:path((?!concepts(?:/|$)).+)",
      headers: PRIVATE_HEADERS,
    },
    { source: "/", headers: EMBEDDABLE_HEADERS },
    { source: "/concepts", headers: EMBEDDABLE_HEADERS },
    { source: "/concepts/:path*", headers: EMBEDDABLE_HEADERS },
  ],
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
