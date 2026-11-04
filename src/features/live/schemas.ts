import { z } from "zod";

export const SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const createTargetInput = z.object({
  projectId: z.uuid(),
  siteUrl: z
    .string()
    .trim()
    .url("https:// 로 시작하는 배포 주소를 넣어 주세요.")
    .max(300),
});
export const targetInput = z.object({ projectId: z.uuid() });

export const liveResultSchema = z.object({
  id: z.string(),
  severity: z.enum(SEVERITIES),
  title: z.string(),
  target: z.string(),
  detail: z.string(),
  fix: z.string(),
  isNew: z.boolean().default(false),
});
export type LiveResult = z.infer<typeof liveResultSchema>;

export const liveSummarySchema = z.object({
  requests: z.number().default(0),
  supabase: z.enum(["found", "not_found"]).optional(),
  tables: z.number().default(0),
  buckets: z.number().default(0),
  scripts: z.number().default(0),
  notes: z.array(z.string()).default([]),
});
export type LiveSummary = z.infer<typeof liveSummarySchema>;

export type LiveCheckView = {
  id: string;
  trigger: "manual" | "daily";
  status: "running" | "done" | "failed";
  results: LiveResult[];
  summary: LiveSummary;
  error: string | null;
  createdAt: string;
};

export type LiveTargetView = {
  id: string;
  siteUrl: string;
  verifyToken: string;
  verified: boolean;
  lastCheckedAt: string | null;
};

export const VERIFY_PATH = "/.well-known/lego-verify.txt";

export type LiveOverviewRow = {
  projectId: string;
  repoFullName: string;
  siteUrl: string | null;
  verified: boolean;
  lastCheck: {
    status: LiveCheckView["status"];
    createdAt: string;
    counts: Partial<Record<Severity, number>>;
    newCount: number;
  } | null;
};
