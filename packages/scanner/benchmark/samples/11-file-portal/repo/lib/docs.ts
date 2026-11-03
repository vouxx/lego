import { readFile } from "node:fs/promises";
import path from "node:path";

export function readDoc(name: string) {
  return readFile(path.join(process.cwd(), "docs", `${name}.md`), "utf8");
}
