import { maskSecrets } from "@lego/scanner/secrets";
import type { SessionMessage } from "../schemas";

const PEM =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
// postgres://user:password@host 처럼 URL 에 들어 있는 비밀번호
const URL_PASSWORD = /\b([a-z][a-z0-9+.-]*:\/\/[^:/\s@]+:)([^@\s/]+)(@)/gi;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const HOME_PATHS: [RegExp, string][] = [
  [/\/Users\/[^/\s"'`]+/g, "/Users/<user>"],
  [/\/home\/[^/\s"'`]+/g, "/home/<user>"],
  [/[A-Za-z]:\\Users\\[^\\\s"'`]+/g, "C:\\Users\\<user>"],
];
// KEY=value, "password": "..." 처럼 이름으로 드러나는 비밀값
const NAMED_SECRET =
  /\b([A-Za-z0-9_]*(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)[A-Za-z0-9_]*)(["']?\s*[:=]\s*["']?)([^\s"'`,;]{8,})/gi;

/**
 * 세션 로그 마스킹. SEC-001 비밀값 형식, 개인 키 블록, URL 안 비밀번호, 이름으로 드러나는 비밀값, 이메일, 홈 디렉터리 경로를 가린다.
 * 브라우저(업로드 전 1차)와 서버(2차 검사)가 같은 함수를 쓴다.
 */
export function maskText(text: string): { text: string; count: number } {
  let count = 0;
  const bump = <T>(value: T) => {
    count += 1;
    return value;
  };
  let out = text.replace(PEM, () => bump("[개인 키 가림]"));
  out = out.replace(
    URL_PASSWORD,
    (m, head: string, pass: string, at: string) =>
      pass === "****" ? m : bump(`${head}****${at}`),
  );
  const secrets = maskSecrets(out);
  if (secrets !== out) count += 1;
  out = secrets;
  out = out.replace(
    NAMED_SECRET,
    (_m, name: string, sep: string, value: string) =>
      value.includes("****") || value.startsWith("<")
        ? `${name}${sep}${value}`
        : bump(`${name}${sep}****`),
  );
  out = out.replace(EMAIL, () => bump("<email>"));
  for (const [pattern, replacement] of HOME_PATHS) {
    out = out.replace(pattern, (m) =>
      m === replacement ? m : bump(replacement),
    );
  }
  return { text: out, count };
}

export function maskMessages(messages: SessionMessage[]) {
  let count = 0;
  const masked = messages.map((m) => {
    const text = maskText(m.text);
    count += text.count;
    return {
      ...m,
      text: text.text,
      tools: m.tools?.map((t) => {
        if (!t.target) return t;
        const target = maskText(t.target);
        count += target.count;
        return { ...t, target: target.text };
      }),
    };
  });
  return { messages: masked, count };
}
