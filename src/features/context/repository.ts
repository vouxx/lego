import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert } from "@/lib/supabase/types";
import type { ContextTarget } from "./schemas";

// 읽기는 사용자 세션(RLS), 쓰기는 secret 키. 쓰기 전 소유 확인은 services 가 RLS 읽기로 한다.

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, user_id, installation_id, repo_full_name, default_branch")
    .eq("id", projectId)
    .maybeSingle();
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

const CONTEXT_FILE_COLUMNS =
  "id, project_id, user_id, target, analysis, analyzed_commit, current_version_id, outdated, updated_at";

export async function findMyContextFile(
  projectId: string,
  target: ContextTarget,
) {
  const supabase = await createClient();
  return supabase
    .from("context_files")
    .select(CONTEXT_FILE_COLUMNS)
    .eq("project_id", projectId)
    .eq("target", target)
    .maybeSingle();
}

export async function getMyContextFile(contextFileId: string) {
  const supabase = await createClient();
  return supabase
    .from("context_files")
    .select(
      `${CONTEXT_FILE_COLUMNS}, projects(id, installation_id, repo_full_name, default_branch)`,
    )
    .eq("id", contextFileId)
    .maybeSingle();
}

export async function upsertContextFile(row: {
  projectId: string;
  userId: string;
  target: ContextTarget;
  analysis: Insert<"context_files">["analysis"];
  analyzedCommit: string;
}) {
  return createAdminClient()
    .from("context_files")
    .upsert(
      {
        project_id: row.projectId,
        user_id: row.userId,
        target: row.target,
        analysis: row.analysis,
        analyzed_commit: row.analyzedCommit,
        outdated: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,target" },
    )
    .select("id")
    .single();
}

export async function insertContextVersion(row: {
  contextFileId: string;
  userId: string;
  content: string;
  source: "generated" | "edited";
  basedOnCommit: string | null;
}) {
  const admin = createAdminClient();
  const inserted = await admin
    .from("context_file_versions")
    .insert({
      context_file_id: row.contextFileId,
      user_id: row.userId,
      content: row.content,
      source: row.source,
      based_on_commit: row.basedOnCommit,
    })
    .select("id")
    .single();
  if (inserted.error) return inserted;

  const updated = await admin
    .from("context_files")
    .update({
      current_version_id: inserted.data.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.contextFileId);
  return updated.error ? { data: null, error: updated.error } : inserted;
}

export async function listContextVersions(contextFileId: string) {
  const supabase = await createClient();
  return supabase
    .from("context_file_versions")
    .select("id, source, created_at, pr_url, based_on_commit")
    .eq("context_file_id", contextFileId)
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function getVersionContents(versionIds: string[]) {
  const supabase = await createClient();
  return supabase
    .from("context_file_versions")
    .select("id, content")
    .in("id", versionIds);
}

export async function setVersionPrUrl(versionId: string, prUrl: string) {
  return createAdminClient()
    .from("context_file_versions")
    .update({ pr_url: prUrl })
    .eq("id", versionId);
}

export async function listContextRules(contextFileId: string) {
  const supabase = await createClient();
  return supabase
    .from("context_file_rules")
    .select("id, item_id, section, enabled, override_content, created_at")
    .eq("context_file_id", contextFileId)
    .order("created_at");
}

/** 새로 적용된 규칙 팩 항목만 기본값으로 넣는다. 사용자가 바꾼 값은 그대로 둔다. */
export async function ensureContextRules(rows: Insert<"context_file_rules">[]) {
  if (rows.length === 0) return { error: null };
  return createAdminClient().from("context_file_rules").upsert(rows, {
    onConflict: "context_file_id,item_id",
    ignoreDuplicates: true,
  });
}

export async function setPackRuleEnabled(row: {
  contextFileId: string;
  userId: string;
  itemId: string;
  enabled: boolean;
}) {
  return createAdminClient().from("context_file_rules").upsert(
    {
      context_file_id: row.contextFileId,
      user_id: row.userId,
      item_id: row.itemId,
      enabled: row.enabled,
    },
    { onConflict: "context_file_id,item_id" },
  );
}

export async function setCustomRuleEnabled(
  contextFileId: string,
  ruleId: string,
  enabled: boolean,
) {
  return createAdminClient()
    .from("context_file_rules")
    .update({ enabled })
    .eq("id", ruleId)
    .eq("context_file_id", contextFileId)
    .is("item_id", null);
}

export async function insertCustomRule(row: {
  contextFileId: string;
  userId: string;
  section: string;
  content: string;
}) {
  return createAdminClient().from("context_file_rules").insert({
    context_file_id: row.contextFileId,
    user_id: row.userId,
    section: row.section,
    override_content: row.content,
  });
}

export async function deleteCustomRule(contextFileId: string, ruleId: string) {
  return createAdminClient()
    .from("context_file_rules")
    .delete()
    .eq("id", ruleId)
    .eq("context_file_id", contextFileId)
    .is("item_id", null);
}

/** 가장 최근 완료된 스캔에서 아직 열려 있고 오탐이 아닌 발견 항목. */
export async function listOpenFindings(projectId: string) {
  const supabase = await createClient();
  const { data: scan, error } = await supabase
    .from("scans")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !scan) return { data: [], error };

  return supabase
    .from("findings")
    .select("rule_id, file_path, rules(title)")
    .eq("scan_id", scan.id)
    .eq("status", "open")
    .or("ai_verdict.is.null,ai_verdict.neq.false_positive");
}

export async function insertLlmCall(row: Insert<"llm_calls">) {
  return createAdminClient().from("llm_calls").insert(row);
}

/** 토큰 사용량을 더하고, 이번 달 한도가 남았는지 돌려준다. 0 을 넘기면 확인만 한다. */
export async function addTokenUsage(userId: string, tokens: number) {
  return createAdminClient().rpc("add_token_usage", {
    p_user_id: userId,
    p_tokens: tokens,
  });
}

/** push webhook: 해당 설치·리포의 규칙 파일들. */
export async function listContextFilesForRepo(
  installationId: number,
  repoFullName: string,
) {
  return createAdminClient()
    .from("context_files")
    .select("id, analysis, projects!inner(installation_id, repo_full_name)")
    .eq("projects.installation_id", installationId)
    .eq("projects.repo_full_name", repoFullName);
}

export async function markContextFilesOutdated(ids: string[]) {
  if (ids.length === 0) return { error: null };
  return createAdminClient()
    .from("context_files")
    .update({ outdated: true })
    .in("id", ids);
}

/** 프로젝트에 연결된 가장 최근 완성 스펙의 개요(3단계). 규칙 파일 '프로젝트 개요'에 쓴다. */
export async function findLatestSpecOverview(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("specs")
    .select("overview")
    .eq("project_id", projectId)
    .eq("status", "ready")
    .not("overview", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}
