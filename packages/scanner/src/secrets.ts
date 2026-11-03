/** 알려진 비밀값 형식. SEC-001 탐지와 마스킹이 같은 목록을 쓴다. */
export const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "Anthropic API 키", pattern: /sk-ant-[A-Za-z0-9_-]{32,}/g },
  {
    name: "OpenAI API 키",
    pattern: /sk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/g,
  },
  { name: "Stripe 비밀 키", pattern: /(?:sk|rk)_live_[A-Za-z0-9]{20,}/g },
  { name: "AWS 액세스 키", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    name: "GitHub 토큰",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g,
  },
  { name: "Google API 키", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: "Slack 토큰", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Supabase secret 키", pattern: /\bsb_secret_[A-Za-z0-9_-]{20,}/g },
  {
    name: "개인 키",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
];

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

/** 브라우저(세션 로그 마스킹)와 Node 양쪽에서 돈다. */
function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return new TextDecoder().decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  );
}

/** JWT 중 Supabase service_role 토큰만 비밀값으로 본다(anon 키는 공개용). */
export function isServiceRoleJwt(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return false;
  try {
    const json = JSON.parse(decodeBase64Url(payload)) as {
      role?: unknown;
    };
    return json.role === "service_role";
  } catch {
    return false;
  }
}

export function findSecrets(line: string): { name: string; value: string }[] {
  const found: { name: string; value: string }[] = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    for (const match of line.matchAll(pattern))
      found.push({ name, value: match[0] });
  }
  for (const match of line.matchAll(JWT_PATTERN)) {
    if (isServiceRoleJwt(match[0])) {
      found.push({ name: "Supabase service_role 키", value: match[0] });
    }
  }
  return found;
}

function maskValue(value: string) {
  if (value.startsWith("-----BEGIN")) return value;
  if (value.length <= 12) return "****";
  return `${value.slice(0, 7)}****${value.slice(-4)}`;
}

/** 저장하거나 LLM 에 보내기 전에 비밀값을 가린다: sk-ant-****abcd */
export function maskSecrets(text: string): string {
  let masked = text;
  for (const { value } of findSecrets(text)) {
    masked = masked.split(value).join(maskValue(value));
  }
  return masked;
}
