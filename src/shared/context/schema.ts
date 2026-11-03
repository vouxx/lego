import { z } from "zod";
import { detectedStackSchema } from "@/shared/stack/schema";

export const CONTEXT_TARGETS = [
  "claude_md",
  "cursorrules",
  "agents_md",
] as const;
export type ContextTarget = (typeof CONTEXT_TARGETS)[number];

export const TARGET_INFO: Record<
  ContextTarget,
  { path: string; tool: string }
> = {
  claude_md: { path: "CLAUDE.md", tool: "Claude Code" },
  cursorrules: { path: ".cursorrules", tool: "Cursor" },
  agents_md: { path: "AGENTS.md", tool: "Codex 등" },
};

export function parseTarget(value: unknown): ContextTarget {
  return CONTEXT_TARGETS.find((t) => t === value) ?? "claude_md";
}

/** 리포 분석 결과. 규칙을 켜고 끌 때 LLM 없이 다시 조합하는 데 쓴다. */
export const contextAnalysisSchema = z.object({
  stack: detectedStackSchema,
  rootEntries: z.array(z.string()),
  commands: z.array(z.object({ label: z.string(), command: z.string() })),
  folders: z.array(z.object({ path: z.string(), summary: z.string() })),
  /** 스펙(3단계)에서 온 프로젝트 개요. 있으면 문서 맨 앞에 들어간다. */
  overview: z.string().optional(),
  cautions: z.array(
    z.object({
      ruleId: z.string(),
      title: z.string(),
      files: z.array(z.string()),
      count: z.number(),
    }),
  ),
});
export type ContextAnalysis = z.infer<typeof contextAnalysisSchema>;

export type RuleLine = { section: string; content: string; enabled: boolean };
