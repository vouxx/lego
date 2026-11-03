import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert } from "@/lib/supabase/types";
import type { Level } from "./schemas";

// 개념 사전은 공개 데이터라 로그인 없이도 secret 키로 읽는다. 나머지 읽기는 세션(RLS).

export async function listConcepts() {
  return createAdminClient()
    .from("concepts")
    .select("slug, title, summary, related_rule_ids")
    .order("sort_order");
}

export async function getConcept(slug: string) {
  return createAdminClient()
    .from("concepts")
    .select("slug, title, summary, body_md, related_rule_ids")
    .eq("slug", slug)
    .maybeSingle();
}

export async function listRuleTitles(ids: string[]) {
  return createAdminClient()
    .from("rules")
    .select("id, title, severity")
    .in("id", ids.length > 0 ? ids : ["__none__"]);
}

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, installation_id, repo_full_name, default_branch")
    .eq("id", projectId)
    .maybeSingle();
}

export async function listMyProjects() {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, repo_full_name")
    .order("created_at", { ascending: false });
}

export async function getMyFinding(findingId: string) {
  const supabase = await createClient();
  return supabase
    .from("findings")
    .select(
      "id, rule_id, file_path, line_start, line_end, snippet, explanation, rules(title), scans(project_id)",
    )
    .eq("id", findingId)
    .maybeSingle();
}

export async function findMyExplanationByHash(codeHash: string, level: Level) {
  const supabase = await createClient();
  return supabase
    .from("explanations")
    .select("id")
    .eq("code_hash", codeHash)
    .eq("level", level)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

/** 다른 사용자가 같은 코드·수준으로 만든 설명(LLM 캐시). 같은 코드를 가진 사람에게만 쓰인다. */
export async function findAnyExplanationByHash(codeHash: string, level: Level) {
  return createAdminClient()
    .from("explanations")
    .select("id, content, quizzes(questions)")
    .eq("code_hash", codeHash)
    .eq("level", level)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function insertExplanation(row: Insert<"explanations">) {
  return createAdminClient()
    .from("explanations")
    .insert(row)
    .select("id")
    .single();
}

export async function updateExplanationContent(
  explanationId: string,
  content: Insert<"explanations">["content"],
) {
  return createAdminClient()
    .from("explanations")
    .update({ content })
    .eq("id", explanationId);
}

export async function insertQuiz(row: Insert<"quizzes">) {
  return createAdminClient().from("quizzes").insert(row);
}

export async function getMyExplanation(explanationId: string) {
  const supabase = await createClient();
  return supabase
    .from("explanations")
    .select(
      "id, level, source, source_ref, code, language, content, created_at, quizzes(id, questions, quiz_attempts(score, created_at))",
    )
    .eq("id", explanationId)
    .maybeSingle();
}

export async function listMyExplanations() {
  const supabase = await createClient();
  return supabase
    .from("explanations")
    .select("id, level, source, source_ref, content, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function getMyQuiz(quizId: string) {
  const supabase = await createClient();
  return supabase
    .from("quizzes")
    .select("id, questions, explanations(content)")
    .eq("id", quizId)
    .maybeSingle();
}

export async function insertQuizAttempt(row: Insert<"quiz_attempts">) {
  return createAdminClient().from("quiz_attempts").insert(row);
}

export async function listMyMastery() {
  const supabase = await createClient();
  return supabase
    .from("user_concepts")
    .select("concept_slug, mastery, last_seen_at, concepts(title)")
    .order("last_seen_at", { ascending: false });
}

export async function getMasteryRows(userId: string, slugs: string[]) {
  return createAdminClient()
    .from("user_concepts")
    .select("concept_slug, mastery")
    .eq("user_id", userId)
    .in("concept_slug", slugs.length > 0 ? slugs : ["__none__"]);
}

export async function upsertMastery(rows: Insert<"user_concepts">[]) {
  if (rows.length === 0) return { error: null };
  return createAdminClient()
    .from("user_concepts")
    .upsert(rows, { onConflict: "user_id,concept_slug" });
}

/** 처음 본 개념은 숙련도 0 으로 기록하고, 본 적 있으면 본 시각만 바꾼다. */
export async function touchConcepts(userId: string, slugs: string[]) {
  if (slugs.length === 0) return { error: null };
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("user_concepts").upsert(
    slugs.map((slug) => ({
      user_id: userId,
      concept_slug: slug,
      last_seen_at: now,
    })),
    { onConflict: "user_id,concept_slug", ignoreDuplicates: true },
  );
  if (error) return { error };
  return admin
    .from("user_concepts")
    .update({ last_seen_at: now })
    .eq("user_id", userId)
    .in("concept_slug", slugs);
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
