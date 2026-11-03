import { z } from "zod";
import type { DetectedStack, StackTag } from "./schema";

export type StackSnapshot = {
  /** 리포 최상위 파일·폴더 이름 */
  rootEntries: string[];
  /** src/ 아래 이름(없으면 빈 배열) */
  srcEntries: string[];
  /** package.json 을 파싱한 값(없으면 null) */
  packageJson: unknown;
};

const packageJsonSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const VERSION_KEYS = [
  "next",
  "react",
  "typescript",
  "tailwindcss",
  "@supabase/supabase-js",
  "vite",
];

const LOCKFILES: [string, NonNullable<DetectedStack["packageManager"]>][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"],
];

/** package.json 과 폴더 구조로 기술 스택을 판별한다. */
export function detectStack({
  rootEntries,
  srcEntries,
  packageJson,
}: StackSnapshot): DetectedStack {
  const parsed = packageJsonSchema.safeParse(packageJson);
  const deps = parsed.success
    ? { ...parsed.data.devDependencies, ...parsed.data.dependencies }
    : {};
  const has = (name: string) => name in deps;
  const hasDir = (name: string) =>
    rootEntries.includes(name) || srcEntries.includes(name);

  const tags = new Set<StackTag>();
  if (has("next")) {
    if (hasDir("app")) tags.add("nextjs-app-router");
    if (hasDir("pages")) tags.add("nextjs-pages-router");
  }
  if (has("react")) tags.add("react");
  if (has("vite")) tags.add("vite");
  if (has("typescript") || rootEntries.includes("tsconfig.json"))
    tags.add("typescript");
  if (
    Object.keys(deps).some((d) => d.startsWith("@supabase/")) ||
    rootEntries.includes("supabase")
  ) {
    tags.add("supabase");
  }
  if (has("tailwindcss")) tags.add("tailwind");
  if (has("vitest")) tags.add("vitest");
  if (has("jest")) tags.add("jest");
  if (has("@playwright/test")) tags.add("playwright");

  const versions = Object.fromEntries(
    VERSION_KEYS.filter(has).map((key) => [key, deps[key] as string]),
  );

  const packageManager =
    LOCKFILES.find(([file]) => rootEntries.includes(file))?.[1] ?? null;

  return { tags: [...tags], packageManager, versions };
}

/** 경로 목록에서 최상위 이름과 src/ 바로 아래 이름을 뽑는다. */
export function topLevelEntries(paths: string[]) {
  const root = new Set<string>();
  const src = new Set<string>();
  for (const path of paths) {
    const [first, second] = path.split("/");
    if (first) root.add(first);
    if (first === "src" && second) src.add(second);
  }
  return { rootEntries: [...root], srcEntries: [...src] };
}

// 예시·샘플·벤치마크·테스트·문서·템플릿 폴더의 package.json 은 리포의 실제 스택이 아니다.
const IGNORED_PACKAGE_DIRS =
  /(^|\/)(node_modules|[^/]*examples?[^/]*|fixtures?|samples?|benchmarks?|__tests__|tests?|e2e|playground|templates?|[^/]*docs?|\.[^/]+)\//;
const MAX_PACKAGES = 40;

function parseJson(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

/**
 * 리포 전체 스택. 모노레포(apps/web, packages/*)도 보도록 워크스페이스 package.json 마다 감지해 합친다.
 * 패키지 매니저는 루트 lockfile, 버전은 루트를 먼저 보고 없으면 처음 찾은 패키지 것을 쓴다.
 */
export function detectRepoStack(
  paths: string[],
  packageJsons: { path: string; content: string }[],
): DetectedStack {
  const root = detectStack({
    ...topLevelEntries(paths),
    packageJson: parseJson(
      packageJsons.find((p) => p.path === "package.json")?.content ?? "",
    ),
  });
  const tags = new Set(root.tags);
  const versions = { ...root.versions };

  const nested = packageJsons
    .filter(
      (p) => p.path !== "package.json" && !IGNORED_PACKAGE_DIRS.test(p.path),
    )
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length)
    .slice(0, MAX_PACKAGES);
  for (const pkg of nested) {
    const dir = pkg.path.slice(0, -"package.json".length);
    const sub = paths
      .filter((p) => p.startsWith(dir))
      .map((p) => p.slice(dir.length));
    const stack = detectStack({
      ...topLevelEntries(sub),
      packageJson: parseJson(pkg.content),
    });
    for (const tag of stack.tags) tags.add(tag);
    for (const [key, value] of Object.entries(stack.versions))
      versions[key] ??= value;
  }
  return { tags: [...tags], packageManager: root.packageManager, versions };
}
