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

export type ChecklistItem = {
  /** 규칙 팩 항목이면 item id, 직접 추가한 규칙이면 context_file_rules id */
  id: string;
  custom: boolean;
  section: string;
  content: string;
  enabled: boolean;
};

export type ChecklistGroup = { name: string; items: ChecklistItem[] };

export type ContextVersionSummary = {
  id: string;
  source: "generated" | "edited";
  createdAt: string;
  prUrl: string | null;
};

export type PrAvailability =
  | { status: "ready" }
  | { status: "public_repo" }
  | { status: "needs_permission"; settingsUrl: string }
  | { status: "unknown" };

const uuid = z.uuid();
const contextFileId = uuid;

export const generateContextInput = z.object({
  projectId: uuid,
  target: z.enum(CONTEXT_TARGETS),
});

export const toggleRuleInput = z.object({
  contextFileId,
  itemId: uuid,
  custom: z.boolean(),
  enabled: z.boolean(),
});

export const addCustomRuleInput = z.object({
  contextFileId,
  section: z.string().trim().min(1, "섹션 이름을 입력해 주세요.").max(40),
  content: z.string().trim().min(1, "규칙 내용을 입력해 주세요.").max(500),
});

export const removeCustomRuleInput = z.object({
  contextFileId,
  ruleId: uuid,
});

export const saveContextVersionInput = z.object({
  contextFileId,
  content: z.string().max(50_000, "문서가 너무 깁니다."),
});

export const openContextPrInput = z.object({ contextFileId });
