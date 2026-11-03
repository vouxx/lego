import { z } from "zod";

export const SESSION_TOOLS = ["claude_code", "cursor", "text"] as const;
export type SessionTool = (typeof SESSION_TOOLS)[number];
export const TOOL_LABELS: Record<SessionTool, string> = {
  claude_code: "Claude Code",
  cursor: "Cursor",
  text: "텍스트",
};

export const VISIBILITIES = ["private", "unlisted", "public"] as const;
export type Visibility = (typeof VISIBILITIES)[number];
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: "나만 보기",
  unlisted: "링크가 있는 사람",
  public: "갤러리에 공개",
};

export const INSIGHT_KINDS = ["good_prompt", "stuck", "lesson"] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];
export const INSIGHT_LABELS: Record<InsightKind, string> = {
  good_prompt: "잘 먹힌 프롬프트",
  stuck: "막힌 지점",
  lesson: "교훈",
};

/** 형식별 파서가 만드는 공통 메시지. 원본 로그 대신 이것만(마스킹 후) 서버에 올라간다. */
export const messageSchema = z.object({
  role: z.enum(["user", "assistant", "tool"]),
  text: z.string(),
  tools: z
    .array(z.object({ name: z.string(), target: z.string().nullable() }))
    .optional(),
  isError: z.boolean().optional(),
  timestamp: z.string().optional(),
});
export type SessionMessage = z.infer<typeof messageSchema>;

export const statsSchema = z.object({
  turns: z.number(),
  userTurns: z.number(),
  assistantTurns: z.number(),
  toolCalls: z.number(),
  topTools: z.array(z.object({ name: z.string(), count: z.number() })),
  repeatedEdits: z.array(z.object({ file: z.string(), count: z.number() })),
  repeatedErrors: z.array(z.object({ error: z.string(), count: z.number() })),
  approxTokens: z.number(),
  durationMinutes: z.number().nullable(),
  maskedCount: z.number(),
});
export type SessionStats = z.infer<typeof statsSchema>;

/** Storage 에 올리는 파일 형식. */
export const uploadFileSchema = z.object({
  version: z.literal(1),
  tool: z.enum(SESSION_TOOLS),
  messages: z.array(messageSchema).max(20_000),
});
export type UploadFile = z.infer<typeof uploadFileSchema>;

// LLM 분석 출력 ----------------------------------------------------------------

export const analysisOutput = z.object({
  title: z.string(),
  goal: z.string(),
  outcome: z.string(),
  tags: z.array(z.string()),
  insights: z.array(
    z.object({
      kind: z.enum(INSIGHT_KINDS),
      content: z.string(),
      promptText: z.string(),
      turnIndex: z.number().int(),
    }),
  ),
});

// 화면 입력 ------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 5_000_000;

export const createUploadInput = z.object({
  tool: z.enum(SESSION_TOOLS),
  title: z.string().trim().max(80),
  projectId: z.uuid().nullable(),
  bytes: z
    .number()
    .int()
    .min(1)
    .max(MAX_UPLOAD_BYTES, "로그가 너무 큽니다(최대 5MB)."),
});

const sessionId = z.object({ sessionId: z.uuid() });
export const finalizeInput = sessionId;
export const retryAnalysisInput = sessionId;
export const deleteSessionInput = sessionId;
export const setVisibilityInput = sessionId.extend({
  visibility: z.enum(VISIBILITIES),
});
export const insightIdInput = z.object({ insightId: z.uuid() });
export const toggleLikeInput = sessionId;
export const reportInput = sessionId.extend({
  reason: z.string().trim().min(2, "신고 이유를 적어 주세요.").max(500),
});

// 화면 표시용 -----------------------------------------------------------------

export type InsightView = {
  id: string;
  kind: InsightKind;
  content: string;
  promptText: string | null;
  turnIndex: number | null;
};

export type SessionCard = {
  id: string;
  slug: string | null;
  title: string;
  tool: SessionTool;
  tags: string[];
  goal: string | null;
  likes: number;
  createdAt: string;
  status: string;
  visibility: Visibility;
};
