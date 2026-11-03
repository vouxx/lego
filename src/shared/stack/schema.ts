import { z } from "zod";

export const STACK_TAGS = [
  "nextjs-app-router",
  "nextjs-pages-router",
  "react",
  "vite",
  "typescript",
  "supabase",
  "tailwind",
  "vitest",
  "jest",
  "playwright",
] as const;
export type StackTag = (typeof STACK_TAGS)[number];

export const STACK_LABELS: Record<StackTag, string> = {
  "nextjs-app-router": "Next.js App Router",
  "nextjs-pages-router": "Next.js Pages Router",
  react: "React",
  vite: "Vite",
  typescript: "TypeScript",
  supabase: "Supabase",
  tailwind: "Tailwind CSS",
  vitest: "Vitest",
  jest: "Jest",
  playwright: "Playwright",
};

export const PACKAGE_MANAGERS = ["pnpm", "yarn", "npm", "bun"] as const;

// 예전에 저장한 행에 없는 태그가 섞여 있어도 읽히도록 모르는 태그는 버린다.
export const detectedStackSchema = z.object({
  tags: z
    .array(z.string())
    .transform((tags) =>
      tags.filter((t): t is StackTag =>
        (STACK_TAGS as readonly string[]).includes(t),
      ),
    ),
  packageManager: z.enum(PACKAGE_MANAGERS).nullable(),
  versions: z.record(z.string(), z.string()),
});
export type DetectedStack = z.infer<typeof detectedStackSchema>;
