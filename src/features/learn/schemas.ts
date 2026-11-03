import { z } from "zod";

export const LEVELS = ["beginner_nondev", "beginner", "intermediate"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, string> = {
  beginner_nondev: "비개발자",
  beginner: "초급",
  intermediate: "중급",
};

export const MAX_CODE_CHARS = 20_000;
export const MAX_FILE_LINES = 400;

// LLM 구조화 출력. 개수 제한은 받은 뒤 검사한다.
export const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number().int(),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const explanationOutput = z.object({
  summary: z.string(),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })),
  mermaid: z.string(),
  conceptSlugs: z.array(z.string()),
  extraConcepts: z.array(
    z.object({ title: z.string(), explanation: z.string() }),
  ),
  quiz: z.array(quizQuestionSchema),
});

export const mermaidOutput = z.object({ mermaid: z.string() });

/** explanations.content 에 저장하는 형식(퀴즈는 quizzes 테이블에 따로). */
export const explanationContentSchema = z.object({
  summary: z.string(),
  steps: z.array(z.object({ title: z.string(), detail: z.string() })),
  mermaid: z.string(),
  conceptSlugs: z.array(z.string()),
  extraConcepts: z.array(
    z.object({ title: z.string(), explanation: z.string() }),
  ),
  diagramRetried: z.boolean().optional(),
});
export type ExplanationContent = z.infer<typeof explanationContentSchema>;

// 화면 입력 ------------------------------------------------------------------

const level = z.enum(LEVELS);

export const explainPasteInput = z.object({
  code: z
    .string()
    .trim()
    .min(1, "코드를 붙여넣어 주세요.")
    .max(
      MAX_CODE_CHARS,
      `코드는 ${MAX_CODE_CHARS.toLocaleString()}자 이내로 넣어 주세요.`,
    ),
  level,
});

export const explainFileInput = z
  .object({
    projectId: z.uuid(),
    path: z.string().trim().min(1, "파일 경로를 입력해 주세요.").max(300),
    startLine: z.number().int().min(1),
    endLine: z.number().int().min(1),
    level,
  })
  .refine((v) => v.endLine >= v.startLine, "끝 줄이 시작 줄보다 앞입니다.")
  .refine(
    (v) => v.endLine - v.startLine < MAX_FILE_LINES,
    `한 번에 ${MAX_FILE_LINES}줄까지 설명할 수 있습니다.`,
  );

export const explainFindingInput = z.object({ findingId: z.uuid(), level });

export const submitQuizInput = z.object({
  quizId: z.uuid(),
  answers: z.array(z.number().int().min(0).max(9)),
});

export const deleteExplanationInput = z.object({ explanationId: z.uuid() });

export const retryDiagramInput = z.object({ explanationId: z.uuid() });

// 화면 표시용 -----------------------------------------------------------------

export type ConceptCard = { slug: string; title: string; summary: string };

export type ExplanationView = {
  id: string;
  level: Level;
  source: "paste" | "file" | "finding";
  sourceRef: string | null;
  code: string;
  language: string | null;
  content: ExplanationContent;
  concepts: ConceptCard[];
  quiz: {
    id: string;
    questions: { question: string; options: string[] }[];
    lastScore: number | null;
  } | null;
  createdAt: string;
};

export type QuizResult = {
  score: number;
  results: { correct: boolean; answerIndex: number; explanation: string }[];
};

export type MasteryView = {
  slug: string;
  title: string;
  mastery: number;
  lastSeenAt: string;
};
