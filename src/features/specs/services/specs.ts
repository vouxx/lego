import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth";
import { stackText } from "@/shared/context/render";
import { err, ok, type Result } from "@/shared/lib/result";
import { STACK_TAGS, type StackTag } from "@/shared/stack/schema";
import {
  findMyProject,
  getMySpec,
  getMyTask,
  insertSpec,
  insertTemplate,
  listMyProjectsForSpec,
  listMySpecs,
  listSpecTasks,
  updateSpec,
  updateTask,
} from "../repository";
import {
  designOutput,
  questionSchema,
  screenSchema,
  TASK_STATUSES,
  type PromptTool,
  type SpecQuestion,
  type SpecScreen,
  type SpecStatus,
  type SpecSummary,
  type SpecTable,
  type SpecTaskView,
  type TaskStatus,
} from "../schemas";
import { generateQuestions, regeneratePrompt } from "./llm-stages";
import { isLocked } from "./task-graph";
import { hasTokenQuota, usageRecorder } from "./usage";

const NOT_FOUND = err("not_found", "스펙을 찾을 수 없습니다.");

export async function getMySpecs(): Promise<Result<SpecSummary[]>> {
  const { data, error } = await listMySpecs();
  if (error) return err("db_error", "스펙 목록을 불러오지 못했습니다.");
  return ok(
    data.map((s) => ({
      id: s.id,
      title: s.title ?? s.idea.slice(0, 30),
      idea: s.idea,
      status: s.status as SpecStatus,
      createdAt: s.created_at,
      taskCount: s.spec_tasks.length,
      doneCount: s.spec_tasks.filter((t) => t.status === "done").length,
    })),
  );
}

export async function getProjectOptions() {
  const { data } = await listMyProjectsForSpec();
  return (data ?? []).map((p) => ({ id: p.id, name: p.repo_full_name }));
}

/** 아이디어를 저장하고 확인 질문을 만든다. */
export async function createSpec(
  user: CurrentUser,
  input: { idea: string; projectId: string | null },
): Promise<Result<{ specId: string }>> {
  if (input.projectId) {
    const { data } = await findMyProject(input.projectId);
    if (!data) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  }
  if (!(await hasTokenQuota(user.id))) {
    return err("quota_exceeded", "이번 달 AI 사용 한도를 모두 썼습니다.");
  }

  const inserted = await insertSpec({
    user_id: user.id,
    project_id: input.projectId,
    idea: input.idea,
  });
  if (inserted.error) return err("db_error", "스펙을 저장하지 못했습니다.");
  const specId = inserted.data.id;

  const questions = await generateQuestions(
    input.idea,
    usageRecorder(user.id, specId),
  );
  if (!questions.ok) {
    await updateSpec(specId, {
      status: "failed",
      error: questions.error.message,
    });
    return err(
      "llm_error",
      "확인 질문을 만들지 못했습니다. 다시 시도해 주세요.",
    );
  }
  await updateSpec(specId, {
    title: questions.data.title,
    questions: questions.data.questions,
  });
  return ok({ specId });
}

export async function answerQuestions(input: {
  specId: string;
  answers: Record<string, string>;
}): Promise<Result<{ specId: string }>> {
  const { data: spec } = await getMySpec(input.specId);
  if (!spec) return NOT_FOUND;
  const questions = z.array(questionSchema).catch([]).parse(spec.questions);
  const ids = new Set(questions.map((q) => q.id));
  const answers = Object.fromEntries(
    Object.entries(input.answers).filter(([id]) => ids.has(id)),
  );
  const { error } = await updateSpec(spec.id, { answers });
  if (error) return err("db_error", "답변을 저장하지 못했습니다.");
  return ok({ specId: spec.id });
}

export type SpecView = {
  id: string;
  title: string;
  idea: string;
  status: SpecStatus;
  error: string | null;
  project: { id: string; name: string } | null;
  questions: SpecQuestion[];
  answers: Record<string, string>;
  progress: Record<string, string>;
  prd: string;
  overview: string;
  stackTags: StackTag[];
  stack: string;
  tables: SpecTable[];
  screens: SpecScreen[];
  contextMd: string;
  tasks: SpecTaskView[];
  /** 생성 중으로 10분 넘게 멈춰 있으면 다시 만들 수 있다 */
  generationStale: boolean;
};

const STALE_MS = 10 * 60 * 1000;

export async function getSpecView(specId: string): Promise<Result<SpecView>> {
  const { data: spec } = await getMySpec(specId);
  if (!spec) return NOT_FOUND;
  const { data: rows, error } = await listSpecTasks(specId);
  if (error) return err("db_error", "작업을 불러오지 못했습니다.");

  const statusByKey = new Map(rows.map((r) => [r.key, r.status as TaskStatus]));
  const stackTags = spec.stack_tags.filter((t): t is StackTag =>
    (STACK_TAGS as readonly string[]).includes(t),
  );
  const design = designOutput
    .partial()
    .catch({})
    .parse(spec.data_model ?? {});

  return ok({
    id: spec.id,
    title: spec.title ?? spec.idea.slice(0, 30),
    idea: spec.idea,
    status: spec.status as SpecStatus,
    error: spec.error,
    project: spec.projects
      ? { id: spec.projects.id, name: spec.projects.repo_full_name }
      : null,
    questions: z.array(questionSchema).catch([]).parse(spec.questions),
    answers: z.record(z.string(), z.string()).catch({}).parse(spec.answers),
    progress: z.record(z.string(), z.string()).catch({}).parse(spec.progress),
    prd: spec.prd_md ?? "",
    overview: spec.overview ?? "",
    stackTags,
    stack: stackText({ tags: stackTags, packageManager: null, versions: {} }),
    tables: design.tables ?? [],
    screens: z
      .array(screenSchema)
      .catch([])
      .parse(spec.screens ?? []),
    contextMd: spec.context_md ?? "",
    generationStale:
      Date.now() - Date.parse(spec.generation_started_at ?? spec.updated_at) >
      STALE_MS,
    tasks: rows.map((r) => {
      const dependsOn = r.depends_on;
      return {
        id: r.id,
        key: r.key,
        title: r.title,
        description: r.description,
        acceptanceCriteria: z
          .array(z.string())
          .catch([])
          .parse(r.acceptance_criteria),
        dependsOn,
        prompt: r.prompt,
        status: (TASK_STATUSES as readonly string[]).includes(r.status)
          ? (r.status as TaskStatus)
          : "todo",
        doneCommit: r.done_commit,
        locked: isLocked({ dependsOn }, statusByKey),
      };
    }),
  });
}

export async function updatePrd(input: {
  specId: string;
  prd: string;
}): Promise<Result<null>> {
  const { data: spec } = await getMySpec(input.specId);
  if (!spec) return NOT_FOUND;
  const { error } = await updateSpec(spec.id, { prd_md: input.prd });
  return error ? err("db_error", "PRD 를 저장하지 못했습니다.") : ok(null);
}

export async function updateTaskStatus(input: {
  taskId: string;
  status: TaskStatus;
}): Promise<Result<null>> {
  const { data: task } = await getMyTask(input.taskId);
  if (!task) return err("not_found", "작업을 찾을 수 없습니다.");
  // 직접 완료로 바꾸면 커밋 기록은 없고, 완료를 되돌리면 커밋 기록도 지운다.
  const { error } = await updateTask(
    task.id,
    input.status === "done"
      ? { status: input.status }
      : { status: input.status, done_commit: null },
  );
  return error ? err("db_error", "작업 상태를 바꾸지 못했습니다.") : ok(null);
}

export async function regenerateTaskPrompt(
  user: CurrentUser,
  input: { taskId: string; tool: PromptTool },
): Promise<Result<{ prompt: string }>> {
  const { data: task } = await getMyTask(input.taskId);
  if (!task?.specs) return err("not_found", "작업을 찾을 수 없습니다.");
  if (!(await hasTokenQuota(user.id))) {
    return err("quota_exceeded", "이번 달 AI 사용 한도를 모두 썼습니다.");
  }

  const tags = task.specs.stack_tags.filter((t): t is StackTag =>
    (STACK_TAGS as readonly string[]).includes(t),
  );
  const result = await regeneratePrompt(
    {
      task: {
        key: task.key,
        title: task.title,
        description: task.description,
        acceptanceCriteria: z
          .array(z.string())
          .catch([])
          .parse(task.acceptance_criteria),
        dependsOn: task.depends_on,
      },
      overview: task.specs.overview ?? "",
      stack: stackText({ tags, packageManager: null, versions: {} }),
      tool: input.tool,
    },
    usageRecorder(user.id, task.spec_id),
  );
  if (!result.ok) return err("llm_error", "프롬프트를 다시 만들지 못했습니다.");

  const prompt = result.data.prompt.trim();
  const { error } = await updateTask(task.id, { prompt });
  if (error) return err("db_error", "프롬프트를 저장하지 못했습니다.");
  return ok({ prompt });
}

/** 작업 프롬프트를 내 템플릿으로 저장한다. 다음 스펙의 프롬프트 예시로 쓰인다. */
export async function saveTaskAsTemplate(
  user: CurrentUser,
  taskId: string,
): Promise<Result<null>> {
  const { data: task } = await getMyTask(taskId);
  if (!task?.specs) return err("not_found", "작업을 찾을 수 없습니다.");
  if (!task.prompt.trim()) return err("empty", "프롬프트가 비어 있습니다.");
  const { error } = await insertTemplate({
    owner_id: user.id,
    title: task.title,
    body: task.prompt,
    tags: task.specs.stack_tags,
    source: "task_prompt",
  });
  return error ? err("db_error", "템플릿으로 저장하지 못했습니다.") : ok(null);
}
