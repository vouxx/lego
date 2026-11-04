import { z } from "zod";
import { STACK_TAGS } from "@/shared/stack/schema";

export const SPEC_STATUSES = [
  "questions",
  "generating",
  "ready",
  "failed",
] as const;
export type SpecStatus = (typeof SPEC_STATUSES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PROMPT_TOOLS = ["claude_code", "cursor"] as const;
export type PromptTool = (typeof PROMPT_TOOLS)[number];

export const GENERATION_STAGES = ["prd", "design", "tasks", "prompts"] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export const STAGE_LABELS: Record<GenerationStage, string> = {
  prd: "PRD 작성",
  design: "데이터 모델·화면 설계",
  tasks: "작업 나누기",
  prompts: "작업별 구현 프롬프트",
};

// LLM 구조화 출력 스키마. 개수 제한 같은 제약은 출력 형식에 넣지 않고 받은 뒤 검사한다.

export const questionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  allowCustom: z.boolean(),
});
export type SpecQuestion = z.infer<typeof questionSchema>;

export const questionsOutput = z.object({
  title: z.string(),
  questions: z.array(questionSchema),
});

export const prdOutput = z.object({
  title: z.string(),
  prd: z.string(),
  overview: z.string(),
  stackTags: z.array(z.enum(STACK_TAGS)),
});

export const tableSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  columns: z.array(
    z.object({ name: z.string(), type: z.string(), note: z.string() }),
  ),
  relations: z.array(z.string()),
});
export const screenSchema = z.object({
  path: z.string(),
  name: z.string(),
  purpose: z.string(),
});
export const designOutput = z.object({
  tables: z.array(tableSchema),
  screens: z.array(screenSchema),
});
export type SpecTable = z.infer<typeof tableSchema>;
export type SpecScreen = z.infer<typeof screenSchema>;

export const taskOutlineSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  dependsOn: z.array(z.string()),
});
export type TaskOutline = z.infer<typeof taskOutlineSchema>;
export const tasksOutput = z.object({ tasks: z.array(taskOutlineSchema) });

export const taskPromptsOutput = z.object({
  prompts: z.array(z.object({ key: z.string(), prompt: z.string() })),
});

export const singlePromptOutput = z.object({ prompt: z.string() });

// 화면 입력 ------------------------------------------------------------------

export const createSpecInput = z.object({
  idea: z
    .string()
    .trim()
    .min(2, "아이디어를 한 줄 이상 적어 주세요.")
    .max(2000, "아이디어는 2000자 이내로 적어 주세요."),
  projectId: z.uuid().nullable(),
});

export const answerQuestionsInput = z.object({
  specId: z.uuid(),
  answers: z.record(z.string(), z.string().trim().max(500)),
});

export const updateTaskStatusInput = z.object({
  taskId: z.uuid(),
  status: z.enum(TASK_STATUSES),
});

export const regenerateTaskPromptInput = z.object({
  taskId: z.uuid(),
  tool: z.enum(PROMPT_TOOLS),
});

export const updatePrdInput = z.object({
  specId: z.uuid(),
  prd: z.string().max(50_000),
});

export const deleteSpecInput = z.object({ specId: z.uuid() });

export const saveTemplateInput = z.object({ taskId: z.uuid() });

// 화면 표시용 -----------------------------------------------------------------

export type TaskPrView = {
  number: number;
  title: string;
  url: string | null;
  state: "open" | "closed" | "merged";
  check: "success" | "neutral" | "failure" | null;
};

export type SpecTaskView = {
  id: string;
  key: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  dependsOn: string[];
  prompt: string;
  status: TaskStatus;
  doneCommit: string | null;
  /** [T-n] 으로 이어진 PR */
  prs: TaskPrView[];
  /** 선행 작업이 아직 끝나지 않았는지 */
  locked: boolean;
};

export type SpecSummary = {
  id: string;
  title: string;
  idea: string;
  status: SpecStatus;
  createdAt: string;
  taskCount: number;
  doneCount: number;
};

/** 생성 진행 이벤트(NDJSON 한 줄). */
export type GenerationEvent =
  | { type: "stage"; stage: GenerationStage; status: "start" | "done" }
  | { type: "done" }
  | { type: "error"; message: string };
