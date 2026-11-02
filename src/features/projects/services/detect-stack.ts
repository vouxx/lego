import { z } from "zod";
import type { DetectedStack, StackTag } from "../schemas";

export type RepoSnapshot = {
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
}: RepoSnapshot): DetectedStack {
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
  if (has("@playwright/test")) tags.add("playwright");

  const versions = Object.fromEntries(
    VERSION_KEYS.filter(has).map((key) => [key, deps[key] as string]),
  );

  const packageManager =
    LOCKFILES.find(([file]) => rootEntries.includes(file))?.[1] ?? null;

  return { tags: [...tags], packageManager, versions };
}
