import type { File, Node } from "@babel/types";
import { topLevelDirectives, walk } from "./js-ast";

/**
 * 요청·URL·폼에서 온 값을 가리키는 흔한 표현. 이 표현이나 여기서 만든 변수가 들어간 값을
 * '사용자 입력'으로 본다. 정확한 데이터 흐름 분석이 아니라 후보를 고르는 용도다(판단은 LLM).
 */
export const REQUEST_INPUT =
  /\b(?:searchParams|useSearchParams|URLSearchParams|formData|params|query|body|nextUrl)\b|\breq\.(?:url|query|body|params)\b|\brequest\.url\b|\.json\(\)|\.headers\.get\(|\bheaders\(\)\.get\(|\blocation\.(?:search|hash)\b/;

/** 노드의 소스 문자열 */
export const textOf = (node: Node, content: string) =>
  content.slice(node.start ?? 0, node.end ?? 0);

/** 호출 대상 이름. supabase.from("t").insert → "supabase.from.insert" */
export function calleeText(node: Node): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "ThisExpression") return "this";
  if (
    node.type === "MemberExpression" ||
    node.type === "OptionalMemberExpression"
  )
    return `${calleeText(node.object)}.${node.property.type === "Identifier" ? node.property.name : ""}`;
  if (node.type === "CallExpression" || node.type === "OptionalCallExpression")
    return calleeText(node.callee);
  if (node.type === "AwaitExpression") return calleeText(node.argument);
  return "";
}

function boundNames(id: Node, out: string[]) {
  if (id.type === "Identifier") out.push(id.name);
  else if (id.type === "ObjectPattern") {
    for (const p of id.properties) {
      if (p.type === "RestElement") boundNames(p.argument, out);
      else boundNames(p.value, out);
    }
  } else if (id.type === "ArrayPattern") {
    for (const e of id.elements) if (e) boundNames(e, out);
  } else if (id.type === "AssignmentPattern") boundNames(id.left, out);
  return out;
}

const PRIMITIVE_TYPE = /^\s*:\s*(?:string|number|boolean|bigint)\s*$/;

/** "use server" 파일에서 export 한 함수의 인자 이름. Server Action 인자는 그 자체가 사용자 입력이다. */
function serverActionParams(
  ast: File,
  content: string,
  skipPrimitive: boolean,
) {
  if (!topLevelDirectives(ast).includes("use server")) return [];
  const names: string[] = [];
  const addParams = (fn: Node) => {
    if (
      fn.type !== "FunctionDeclaration" &&
      fn.type !== "ArrowFunctionExpression" &&
      fn.type !== "FunctionExpression"
    )
      return;
    for (const p of fn.params) {
      const annotation =
        p.type === "Identifier" && p.typeAnnotation
          ? textOf(p.typeAnnotation, content)
          : "";
      if (skipPrimitive && PRIMITIVE_TYPE.test(annotation)) continue;
      boundNames(p, names);
    }
  };
  for (const stmt of ast.program.body) {
    if (stmt.type !== "ExportNamedDeclaration" || !stmt.declaration) continue;
    const d = stmt.declaration;
    if (d.type === "FunctionDeclaration") addParams(d);
    if (d.type === "VariableDeclaration")
      for (const v of d.declarations) if (v.init) addParams(v.init);
  }
  return names;
}

/**
 * 요청 주소를 바탕으로 만들었지만 경로가 고정된 URL. new URL("/login", request.url),
 * request.nextUrl.clone() 처럼 내 사이트 안을 가리키므로 입력으로 보지 않는다.
 */
function isOwnSiteUrl(init: Node) {
  if (init.type === "NewExpression" && calleeText(init.callee) === "URL") {
    const first = init.arguments[0];
    if (first?.type === "StringLiteral") return first.value.startsWith("/");
    if (first?.type === "TemplateLiteral")
      return /^\/[^/\\]/.test(first.quasis[0]?.value.raw ?? "");
    return false;
  }
  return (
    init.type === "CallExpression" &&
    /(?:^|\.)nextUrl\.clone$/.test(calleeText(init.callee))
  );
}

export type Taint = {
  names: Set<string>;
  /** 값의 소스가 사용자 입력을 쓰는지 */
  test: (text: string) => boolean;
};

/**
 * 파일 안에서 사용자 입력에서 만들어진 변수 이름을 모은다. 변수에서 변수로 이어진 것도 따라간다.
 * stop 에 걸리는 값(예: 스키마 검증 결과)은 입력으로 보지 않는다.
 */
export function collectTaint(
  ast: File,
  content: string,
  options: { stop?: RegExp; skipPrimitiveParams?: boolean } = {},
): Taint {
  const names = new Set(
    serverActionParams(ast, content, options.skipPrimitiveParams ?? false),
  );
  let pattern: RegExp | null = null;
  const refresh = () => {
    pattern =
      names.size > 0
        ? new RegExp(
            `\\b(?:${[...names].map((n) => n.replace(/\$/g, "\\$")).join("|")})\\b`,
          )
        : null;
  };
  const test = (text: string) =>
    REQUEST_INPUT.test(text) || (pattern?.test(text) ?? false);
  refresh();

  for (let pass = 0; pass < 4; pass++) {
    const before = names.size;
    walk(ast.program, (node) => {
      let id: Node | null = null;
      let init: Node | null = null;
      if (node.type === "VariableDeclarator" && node.init) {
        id = node.id;
        init = node.init;
      } else if (
        node.type === "AssignmentExpression" &&
        node.left.type === "Identifier"
      ) {
        id = node.left;
        init = node.right;
      }
      if (!id || !init) return;
      const text = textOf(init, content);
      if (options.stop?.test(text) || !test(text) || isOwnSiteUrl(init)) return;
      for (const name of boundNames(id, [])) names.add(name);
    });
    if (names.size === before) break;
    refresh();
  }
  return { names, test };
}

const CHECKED = /startsWith\(|endsWith\(|[!=]==|\.test\(|\.includes\(|\.has\(/;

/** 도메인 고정 부분으로 쓰이는 흔한 값: origin, 기본 주소 환경 변수 */
const ORIGIN_LIKE =
  /^(?:origin|baseUrl|baseURL|siteUrl|appUrl|BASE_URL|SITE_URL|APP_URL|\w+\.origin|new URL\([^)]*\)\.origin|process\.env\.\w+|env\.\w+)$/;

/**
 * 값의 '앞부분'(어느 사이트로 가는지)을 사용자 입력이 정하는지 본다.
 * `/projects/${id}` 처럼 앞이 고정된 경로면 false, `${next}`, `new URL(url)` 이면 true.
 */
export function controlsTarget(
  node: Node,
  content: string,
  taint: Taint,
): boolean {
  const parts: Node[] = [];
  const flatten = (n: Node) => {
    if (n.type === "BinaryExpression" && n.operator === "+") {
      flatten(n.left);
      flatten(n.right);
    } else parts.push(n);
  };

  if (node.type === "StringLiteral") return false;
  if (node.type === "LogicalExpression")
    return (
      controlsTarget(node.left, content, taint) ||
      controlsTarget(node.right, content, taint)
    );
  if (node.type === "ConditionalExpression") {
    // ok ? next : "/" 처럼 조건에서 값을 검사했으면 검사를 통과한 쪽은 믿는다.
    const checked = CHECKED.test(textOf(node.test, content));
    return (
      (!checked && controlsTarget(node.consequent, content, taint)) ||
      controlsTarget(node.alternate, content, taint)
    );
  }
  if (node.type === "ObjectExpression") {
    // router.push({ pathname: "/x", params }) 처럼 주소 필드만 본다.
    for (const p of node.properties) {
      if (
        p.type === "ObjectProperty" &&
        p.key.type === "Identifier" &&
        /^(?:pathname|url|href|baseURL)$/.test(p.key.name)
      )
        return controlsTarget(p.value as Node, content, taint);
    }
    return false;
  }
  if (node.type === "AwaitExpression")
    return controlsTarget(node.argument, content, taint);
  if (node.type === "TSAsExpression" || node.type === "TSNonNullExpression")
    return controlsTarget(node.expression, content, taint);
  if (node.type === "NewExpression" && calleeText(node.callee) === "URL") {
    const first = node.arguments[0];
    return first ? controlsTarget(first, content, taint) : false;
  }
  if (node.type === "TemplateLiteral") {
    node.quasis.forEach((q, i) => {
      parts.push(q);
      const expr = node.expressions[i];
      if (expr) parts.push(expr);
    });
  } else if (node.type === "BinaryExpression") flatten(node);
  else return taint.test(textOf(node, content));

  let afterOrigin = false;
  for (const part of parts) {
    const raw =
      part.type === "TemplateElement"
        ? part.value.raw
        : part.type === "StringLiteral"
          ? part.value
          : null;
    if (raw !== null) {
      if (raw === "") continue;
      // 고정 주소·고정 경로로 시작하면 사이트가 정해진다. "/" 하나만 있으면 "//evil.com" 이 될 수 있다.
      if (raw === "/" && !afterOrigin) continue;
      return false;
    }
    const text = textOf(part, content);
    if (ORIGIN_LIKE.test(text)) {
      afterOrigin = true;
      continue;
    }
    return taint.test(text);
  }
  return false;
}
