import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth";
import { reportError } from "@/lib/monitoring";
import { selectPacks, type RulePack } from "@/shared/context/packs";
import { renderContext, stackText } from "@/shared/context/render";
import type { StackTag } from "@/shared/stack/schema";
import {
  bumpTemplateUse,
  claimGeneration,
  getMySpec,
  listRulePacks,
  listTemplatesForTags,
  replaceSpecTasks,
  updateSpec,
} from "../repository";
import {
  questionSchema,
  type GenerationEvent,
  type GenerationStage,
} from "../schemas";
import {
  designText,
  formatAnswers,
  generateDesign,
  generatePrd,
  generateTaskOutline,
  generateTaskPrompts,
} from "./llm-stages";
import { hasTokenQuota, usageRecorder } from "./usage";

// 생성이 이 시간보다 오래 '생성 중'이면 중단된 것으로 보고 다시 시작할 수 있다.
const STALE_MS = 10 * 60 * 1000;

class StageError extends Error {}

/** 규칙 팩 기본값으로 CLAUDE.md 초안을 만든다(리포 분석 없이 스펙만으로). */
async function contextDraft(overview: string, tags: StackTag[]) {
  const { data } = await listRulePacks();
  const packs: RulePack[] = (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    detect: p.detect,
    items: [...p.rule_pack_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        id: i.id,
        section: i.section,
        content: i.content,
        sortOrder: i.sort_order,
        defaultEnabled: i.default_enabled,
      })),
  }));
  const rules = selectPacks(packs, tags).flatMap((pack) =>
    pack.items.map((i) => ({
      section: i.section,
      content: i.content,
      enabled: i.defaultEnabled,
    })),
  );
  return renderContext({
    target: "claude_md",
    analysis: {
      overview,
      stack: { tags, packageManager: null, versions: {} },
      rootEntries: [],
      commands: [],
      folders: [],
      cautions: [],
    },
    rules,
  });
}

/**
 * PRD → 설계 → 작업 → 작업별 프롬프트를 차례로 만들며 진행 이벤트를 내보낸다.
 * 단계 결과는 끝날 때마다 저장해서, 중간에 실패해도 앞 단계 결과는 남는다.
 */
export async function* generateSpec(
  user: CurrentUser,
  specId: string,
): AsyncGenerator<GenerationEvent> {
  const { data: spec } = await getMySpec(specId);
  if (!spec) {
    yield { type: "error", message: "스펙을 찾을 수 없습니다." };
    return;
  }
  if (!(await hasTokenQuota(user.id))) {
    yield { type: "error", message: "이번 달 AI 사용 한도를 모두 썼습니다." };
    return;
  }
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data: claimed } = await claimGeneration(specId, staleBefore);
  if (!claimed?.length) {
    yield {
      type: "error",
      message: "이미 만들고 있습니다. 잠시 뒤 새로고침해 주세요.",
    };
    return;
  }

  const onUsage = usageRecorder(user.id, specId);
  const progress: Partial<Record<GenerationStage, "done">> = {};
  const done = async (stage: GenerationStage) => {
    progress[stage] = "done";
    await updateSpec(specId, { progress });
  };
  const questions = z.array(questionSchema).catch([]).parse(spec.questions);
  const answers = z
    .record(z.string(), z.string())
    .catch({})
    .parse(spec.answers);

  try {
    yield { type: "stage", stage: "prd", status: "start" };
    const prd = await generatePrd(
      { idea: spec.idea, qa: formatAnswers(questions, answers) },
      onUsage,
    );
    if (!prd.ok)
      throw new StageError(`PRD 를 만들지 못했습니다. ${prd.error.message}`);
    const tags = [...new Set(prd.data.stackTags)];
    const stack =
      stackText({ tags, packageManager: null, versions: {} }) || "미정";
    await updateSpec(specId, {
      title: prd.data.title.slice(0, 40) || spec.title,
      prd_md: prd.data.prd,
      overview: prd.data.overview,
      stack_tags: tags,
    });
    await done("prd");
    yield { type: "stage", stage: "prd", status: "done" };

    yield { type: "stage", stage: "design", status: "start" };
    const design = await generateDesign({ prd: prd.data.prd, stack }, onUsage);
    if (!design.ok)
      throw new StageError(`설계를 만들지 못했습니다. ${design.error.message}`);
    await updateSpec(specId, {
      data_model: { tables: design.data.tables },
      screens: design.data.screens,
    });
    await done("design");
    yield { type: "stage", stage: "design", status: "done" };

    yield { type: "stage", stage: "tasks", status: "start" };
    const outline = await generateTaskOutline(
      { prd: prd.data.prd, ...design.data, stack },
      onUsage,
    );
    if (!outline.ok) throw new StageError(outline.error.message);
    await done("tasks");
    yield { type: "stage", stage: "tasks", status: "done" };

    yield { type: "stage", stage: "prompts", status: "start" };
    const { data: templates } = await listTemplatesForTags(tags, 2);
    const prompts = await generateTaskPrompts(
      {
        tasks: outline.data,
        overview: prd.data.overview,
        design: designText(design.data.tables, design.data.screens),
        stack,
        examples: (templates ?? []).map((t) => t.body),
      },
      onUsage,
    );
    await bumpTemplateUse((templates ?? []).map((t) => t.id));
    const { error } = await replaceSpecTasks(
      specId,
      outline.data.map((task, i) => ({
        spec_id: specId,
        user_id: user.id,
        key: task.key,
        seq: i + 1,
        title: task.title,
        description: task.description,
        acceptance_criteria: task.acceptanceCriteria,
        depends_on: task.dependsOn,
        prompt: prompts.get(task.key) ?? "",
      })),
    );
    if (error) throw new Error(error.message);
    await done("prompts");
    yield { type: "stage", stage: "prompts", status: "done" };

    await updateSpec(specId, {
      status: "ready",
      context_md: await contextDraft(prd.data.overview, tags),
    });
    yield { type: "done" };
  } catch (error) {
    const message =
      error instanceof StageError
        ? error.message
        : "스펙을 만드는 중 오류가 났습니다.";
    if (!(error instanceof StageError)) {
      reportError(error, { area: "specs.generate", extra: { specId } });
    }
    await updateSpec(specId, { status: "failed", error: message });
    yield { type: "error", message };
  }
}
