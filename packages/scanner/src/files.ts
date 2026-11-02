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
