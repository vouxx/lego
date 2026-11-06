/**
 * 리포 내용·PR·LLM 출력은 공격자가 조종할 수 있다. GitHub 코멘트나 규칙 파일에 넣기 전에 정리한다.
 */
const ZERO_WIDTH = "​";

/** 한 줄 인라인 코드. 백틱과 줄바꿈으로 코드 영역을 빠져나가지 못하게 한다. */
export function codeSpan(value: string, maxLength = 200) {
  const clean = value.replace(/[`\r\n]/g, " ").slice(0, maxLength);
  return `\`${clean}\``;
}

/** GitHub 마크다운에서 멘션·이미지·링크·HTML 을 무력화한다. */
export function safeMarkdown(text: string) {
  return text
    .replace(/</g, "&lt;")
    .replace(/!\[/g, `!${ZERO_WIDTH}[`)
    .replace(/\]\(/g, `]${ZERO_WIDTH}(`)
    .replace(/@(?=[\w-])/g, `@${ZERO_WIDTH}`);
}

/** 내용의 어떤 백틱 줄보다 긴 코드 펜스로 감싼다. */
export function fenced(text: string) {
  const longest = Math.max(
    2,
    ...[...text.matchAll(/`+/g)].map((m) => m[0].length),
  );
  const fence = "`".repeat(longest + 1);
  return `${fence}\n${text}\n${fence}`;
}

const SUSPICIOUS = [
  /\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b/i,
  /\bbase64\s+(?:-d|--decode)\b/i,
  /\brm\s+-[a-z]*r[a-z]*f?\b/i,
  /\bchmod\s+\+x\b/i,
  /\b(?:printenv|env)\s*\|/i,
  /~?\/\.(?:ssh|aws|npmrc|netrc)\b/i,
  /\bignore\s+(?:all\s+|any\s+)?(?:previous|prior|above)\b/i,
  /(?:이전|위의?|앞선)\s*(?:모든\s*)?(?:지시|명령|규칙)[^\n]*무시/,
];
const TRUSTED_HOSTS =
  /^(?:[\w-]+\.)*(?:github\.com|supabase\.(?:com|io)|nextjs\.org|vercel\.com|developer\.mozilla\.org|owasp\.org|example\.com)$/i;

/** 사람이 붙여넣어 AI 도구에 시킬 글에 있으면 안 되는 내용(원격 실행, 비밀 파일 접근, 낯선 주소 등) */
export function hasSuspiciousInstruction(text: string) {
  if (SUSPICIOUS.some((pattern) => pattern.test(text))) return true;
  return [...text.matchAll(/https?:\/\/([^\s/'"`)>]+)/gi)].some(
    (m) => !TRUSTED_HOSTS.test(m[1]!),
  );
}

/** 규칙 파일에 넣는 한 줄 설명. 줄바꿈으로 새 섹션을 만들지 못하게 하고, 수상하면 뺀다. */
export function safeLine(text: string, maxLength = 160) {
  const line = text
    .replace(/[`#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return hasSuspiciousInstruction(line) ? "" : line;
}
