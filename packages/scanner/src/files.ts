export const JS_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
];

export const isJsFile = (path: string) =>
  JS_EXTENSIONS.some((ext) => path.endsWith(ext));

export const isSqlFile = (path: string) => path.endsWith(".sql");

/** .env.example 같은 템플릿은 커밋해도 된다. */
const ENV_TEMPLATE = /\.(example|sample|template|dist|defaults)$/i;

export const isEnvFile = (path: string) => {
  const name = path.split("/").pop() ?? "";
  return /^\.env(\.[\w.-]+)?$/.test(name) && !ENV_TEMPLATE.test(name);
};

export const isEnvTemplate = (path: string) => {
  const name = path.split("/").pop() ?? "";
  return /^\.env(\.[\w.-]+)?$/.test(name) && ENV_TEMPLATE.test(name);
};

/** 오프셋을 1부터 시작하는 줄 번호로 바꾼다. */
export function lineAt(content: string, offset: number) {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

/**
 * 번들·압축된 JS. 사람이 쓴 코드가 아니라 규칙이 엉뚱한 곳을 가리키므로 건너뛴다.
 * 평균이 아니라 중앙값을 본다. 긴 주석 한 줄을 넣어 규칙을 건너뛰게 만들 수 없도록.
 */
export function isMinified(content: string) {
  if (content.length <= 5_000) return false;
  const lengths = content
    .split("\n")
    .map((line) => line.length)
    .sort((a, b) => a - b);
  return lengths[Math.floor(lengths.length / 2)]! > 300;
}
