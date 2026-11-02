import { parse } from "@babel/parser";
import type { File, Node } from "@babel/types";

/** TS/JSX 를 모두 받아 파싱한다. 문법 오류가 있어도 가능한 만큼 돌려주고, 아예 실패하면 null. */
export function parseJs(content: string): File | null {
  try {
    return parse(content, {
      sourceType: "unambiguous",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    return null;
  }
}

/** 깊이 우선으로 모든 노드를 방문한다. visit 이 false 를 돌려주면 그 아래는 건너뛴다. */
export function walk(
  node: Node,
  visit: (node: Node, parent: Node | null) => boolean | void,
) {
  const stack: [Node, Node | null][] = [[node, null]];
  while (stack.length > 0) {
    const [current, parent] = stack.pop()!;
    if (visit(current, parent) === false) continue;
    for (const key of Object.keys(current)) {
      if (
        key === "loc" ||
        key === "start" ||
        key === "end" ||
        key.endsWith("Comments")
      )
        continue;
      const value = (current as unknown as Record<string, unknown>)[key];
      const children = Array.isArray(value) ? value : [value];
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (
          child &&
          typeof child === "object" &&
          typeof (child as Node).type === "string"
        ) {
          stack.push([child as Node, current]);
        }
      }
    }
  }
}

/** 파일 맨 위 디렉티브("use client", "use server")를 돌려준다. */
export function topLevelDirectives(ast: File): string[] {
  return ast.program.directives.map((d) => d.value.value);
}

export function lineRange(node: Node) {
  return {
    lineStart: node.loc?.start.line ?? 1,
    lineEnd: node.loc?.end.line ?? 1,
  };
}
