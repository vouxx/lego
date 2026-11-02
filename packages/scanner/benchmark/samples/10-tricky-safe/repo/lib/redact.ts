// 에러 리포트(Sentry)로 보내기 전에 로그에서 키처럼 보이는 값을 가린다
const PATTERNS = [
  /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g,
  /sk_live_[A-Za-z0-9]{20,}/g,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

export function redact(text: string) {
  return PATTERNS.reduce((acc, re) => acc.replace(re, "[REDACTED]"), text);
}
