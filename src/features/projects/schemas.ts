import { z } from "zod";

export const createProjectInput = z.object({
  repoFullName: z
    .string()
    .regex(/^[\w.-]+\/[\w.-]+$/, "owner/repo 형식이어야 합니다."),
});
export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const STACK_TAGS = [
  "nextjs-app-router",
  "nextjs-pages-router",
  "react",
  "vite",
  "typescript",
  "supabase",
  "tailwind",
  "vitest",
  "playwright",
] as const;
export type StackTag = (typeof STACK_TAGS)[number];

export const detectedStackSchema = z.object({
  tags: z.array(z.enum(STACK_TAGS)),
  packageManager: z.enum(["pnpm", "yarn", "npm", "bun"]).nullable(),
  versions: z.record(z.string(), z.string()),
});
export type DetectedStack = z.infer<typeof detectedStackSchema>;

export type InstallableRepo = {
  fullName: string;
  installationId: number;
  defaultBranch: string;
  isPrivate: boolean;
  alreadyAdded: boolean;
};

export type ProjectSummary = {
  id: string;
  repoFullName: string;
  defaultBranch: string;
  stack: DetectedStack | null;
};
