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
  /** SEC-014 의존성 점검(OSV)을 하지 못한 이유. 예전 스캔에는 없다. */
  dependencyNote: z.string().nullable().optional(),
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

/** 직전 완료 스캔과 비교한 결과 (lego.scan_diff) */
export type ScanDiffView = {
  previousScanId: string;
  newFindingIds: string[];
  unchangedCount: number;
  fixed: {
    fingerprint: string;
    ruleId: string;
    severity: Severity;
    filePath: string;
    lineStart: number;
  }[];
};
