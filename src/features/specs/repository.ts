import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";
import type { TaskStatus } from "./schemas";

// 읽기는 사용자 세션(RLS), 쓰기는 secret 키. 쓰기 전 소유 확인은 services 가 RLS 읽기로 한다.

const SPEC_COLUMNS =
  "id, user_id, project_id, idea, title, questions, answers, prd_md, overview, data_model, screens, stack_tags, context_md, status, progress, error, generation_started_at, created_at, updated_at";

export async function listMySpecs() {
  const supabase = await createClient();
  return supabase
    .from("specs")
    .select("id, idea, title, status, created_at, spec_tasks(status)")
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function getMySpec(specId: string) {
  const supabase = await createClient();
  return supabase
    .from("specs")
    .select(`${SPEC_COLUMNS}, projects(id, repo_full_name)`)
    .eq("id", specId)
    .maybeSingle();
}

export async function listMyProjectsForSpec() {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, repo_full_name")
    .order("created_at", { ascending: false });
}

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
}

export async function insertSpec(row: Insert<"specs">) {
  return createAdminClient().from("specs").insert(row).select("id").single();
}

export async function updateSpec(specId: string, patch: Update<"specs">) {
  return createAdminClient()
    .from("specs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", specId);
}

/** 생성 시작을 한 번만 잡는다. 이미 생성 중이고 오래되지 않았으면 아무 행도 바뀌지 않는다. */
export async function claimGeneration(specId: string, staleBefore: string) {
  return createAdminClient()
    .from("specs")
    .update({
      status: "generating",
      error: null,
      progress: {},
      generation_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", specId)
    .or(
      `status.in.(questions,failed,ready),generation_started_at.lt.${staleBefore}`,
    )
    .select("id");
}

export async function listSpecTasks(specId: string) {
  const supabase = await createClient();
  return supabase
    .from("spec_tasks")
    .select(
      "id, key, seq, title, description, acceptance_criteria, depends_on, prompt, status, done_commit",
    )
    .eq("spec_id", specId)
    .order("seq");
}

export async function getMyTask(taskId: string) {
  const supabase = await createClient();
  return supabase
    .from("spec_tasks")
    .select(
      "id, spec_id, key, title, description, acceptance_criteria, depends_on, prompt, status, specs(overview, stack_tags, title)",
    )
    .eq("id", taskId)
    .maybeSingle();
}

/** 다시 생성하면 작업을 통째로 바꾼다. */
export async function replaceSpecTasks(
  specId: string,
  rows: Insert<"spec_tasks">[],
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("spec_tasks")
    .delete()
    .eq("spec_id", specId);
  if (error || rows.length === 0) return { error };
  return admin.from("spec_tasks").insert(rows);
}

export async function updateTask(taskId: string, patch: Update<"spec_tasks">) {
  return createAdminClient()
    .from("spec_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", taskId);
}

export async function listRulePacks() {
  const supabase = await createClient();
  return supabase
    .from("rule_packs")
    .select(
      "id, slug, name, detect, sort_order, rule_pack_items(id, section, content, sort_order, default_enabled)",
    )
    .order("sort_order");
}

/** 스택 태그가 겹치는 템플릿(내 것 + 공용)을 많이 쓴 순으로. */
export async function listTemplatesForTags(tags: string[], limit: number) {
  const supabase = await createClient();
  return supabase
    .from("prompt_templates")
    .select("id, title, body, use_count")
    .overlaps("tags", tags.length > 0 ? tags : ["__none__"])
    .order("use_count", { ascending: false })
    .limit(limit);
}

export async function bumpTemplateUse(ids: string[]) {
  if (ids.length === 0) return { error: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from("prompt_templates")
    .select("id, use_count")
    .in("id", ids);
  for (const t of data ?? []) {
    await admin
      .from("prompt_templates")
      .update({ use_count: t.use_count + 1 })
      .eq("id", t.id);
  }
  return { error: null };
}

export async function insertTemplate(row: Insert<"prompt_templates">) {
  return createAdminClient().from("prompt_templates").insert(row);
}

export async function insertLlmCall(row: Insert<"llm_calls">) {
  return createAdminClient().from("llm_calls").insert(row);
}

export async function addTokenUsage(userId: string, tokens: number) {
  return createAdminClient().rpc("add_token_usage", {
    p_user_id: userId,
    p_tokens: tokens,
  });
}

/** push webhook: 해당 설치·리포에 연결된 스펙의 작업. */
export async function listTasksForRepo(
  installationId: number,
  repoFullName: string,
) {
  return createAdminClient()
    .from("spec_tasks")
    .select(
      "id, key, status, specs!inner(id, projects!inner(installation_id, repo_full_name))",
    )
    .eq("specs.projects.installation_id", installationId)
    .eq("specs.projects.repo_full_name", repoFullName);
}

export async function markTasksDone(
  rows: { id: string; commit: string }[],
  status: TaskStatus = "done",
) {
  const admin = createAdminClient();
  for (const row of rows) {
    const { error } = await admin
      .from("spec_tasks")
      .update({
        status,
        done_commit: row.commit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) return { error };
  }
  return { error: null };
}

/** 작업(spec_tasks)은 cascade 로 같이 지워진다. */
export async function deleteSpecRow(specId: string) {
  return createAdminClient().from("specs").delete().eq("id", specId);
}
