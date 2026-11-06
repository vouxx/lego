/** 공개 주소. 사이트맵·공유 미리보기처럼 절대 주소가 필요한 곳에 쓴다. */
export function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : "http://localhost:3000";
}
