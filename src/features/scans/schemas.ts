import { z } from "zod";

export const startScanInput = z.object({ projectId: z.uuid() });

export const FINDING_STATUSES = ["open", "ignored", "resolved"] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];
export const findingStatusInput = z.object({
  findingId: z.uuid(),
  status: z.enum(FINDING_STATUSES),
});

export const AI_VERDICTS = [
  "true_positive",
  "false_positive",
  "uncertain",
] as const;
export type AiVerdict = (typeof AI_VERDICTS)[number];

/** Haiku 1차 판별 응답 */
export const triageOutput = z.object({
  results: z.array(
    z.object({
      id: z.number().int(),
      verdict: z.enum(AI_VERDICTS),
      reason: z.string(),
    }),
  ),
});

/** Sonnet 설명·수정 프롬프트 응답 */
export const explainOutput = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      explanation: z.string(),
      fix_prompt: z.string(),
    }),
  ),
});

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const scanSummarySchema = z.object({
  total: z.number(),
  bySeverity: z.record(z.enum(SEVERITIES), z.number()),
  falsePositives: z.number(),
  filesScanned: z.number(),
  truncated: z.boolean(),
  llm: z.enum(["done", "partial", "skipped"]),
  llmNote: z.string().nullable(),
  costUsd: z.number(),
});
export type ScanSummary = z.infer<typeof scanSummarySchema>;

export type ScanStatus = "queued" | "running" | "done" | "failed";

export type ScanView = {
  id: string;
  projectId: string;
  status: ScanStatus;
  progress: number;
  commitSha: string | null;
  summary: ScanSummary | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type FindingView = {
  id: string;
  ruleId: string;
  ruleTitle: string;
  severity: Severity;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  aiVerdict: AiVerdict | null;
  explanation: string | null;
  fixPrompt: string | null;
  status: FindingStatus;
};
