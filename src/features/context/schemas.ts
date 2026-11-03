import { z } from "zod";

export {
  CONTEXT_TARGETS,
  TARGET_INFO,
  contextAnalysisSchema,
  parseTarget,
  type ContextAnalysis,
  type ContextTarget,
  type RuleLine,
} from "@/shared/context/schema";
import { CONTEXT_TARGETS } from "@/shared/context/schema";

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
