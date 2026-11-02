import { lineAt } from "../files";

export type SqlStatement = {
  /** 주석을 지운 문장. 대소문자는 그대로 둔다. */
  text: string;
  line: number;
};

/**
 * 마이그레이션 SQL 을 문장 단위로 나눈다.
 * 함수 본문($$ ... $$)과 문자열 안의 세미콜론은 문장 끝으로 보지 않는다.
 */
export function splitSqlStatements(content: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let current = "";
  let startOffset = -1;
  let i = 0;

  const push = () => {
    const text = current.trim();
    if (text) statements.push({ text, line: lineAt(content, startOffset) });
    current = "";
    startOffset = -1;
  };

  while (i < content.length) {
    const ch = content[i]!;
    const rest = content.slice(i);

    if (rest.startsWith("--")) {
      const end = content.indexOf("\n", i);
      i = end === -1 ? content.length : end;
      continue;
    }
    if (rest.startsWith("/*")) {
      const end = content.indexOf("*/", i + 2);
      i = end === -1 ? content.length : end + 2;
      continue;
    }
    if (startOffset === -1 && !/\s/.test(ch)) startOffset = i;

    const dollar = rest.match(/^\$[A-Za-z_]*\$/);
    if (dollar) {
      const tag = dollar[0];
      const end = content.indexOf(tag, i + tag.length);
      const stop = end === -1 ? content.length : end + tag.length;
      current += content.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (
        j < content.length &&
        !(content[j] === "'" && content[j + 1] !== "'")
      ) {
        j += content[j] === "'" ? 2 : 1;
      }
      current += content.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === ";") {
      push();
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  push();
  return statements;
}

/** "public"."Posts" → posts, private.notes → private.notes */
export function normalizeTableName(raw: string) {
  const parts = raw
    .split(".")
    .map((p) => p.trim().replace(/^"|"$/g, "").toLowerCase());
  if (parts.length === 2 && parts[0] === "public") return parts[1]!;
  return parts.join(".");
}

export const TABLE_NAME = String.raw`((?:"[^"]+"|[\w]+)(?:\s*\.\s*(?:"[^"]+"|[\w]+))?)`;
