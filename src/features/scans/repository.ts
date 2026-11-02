import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Insert, Update } from "@/lib/supabase/types";
import type { FindingStatus } from "./schemas";

// 사용자 화면의 읽기·상태 변경은 세션(RLS), 워커의 쓰기는 secret 키.

export async function findMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, user_id, installation_id, repo_full_name, default_branch")
    .eq("id", projectId)
    .maybeSingle();
}

export async function findActiveScan(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function consumeScanQuota(userId: string) {
  return createAdminClient().rpc("consume_scan_quota", { p_user_id: userId });
}

export async function addTokenUsage(userId: string, tokens: number) {
  return createAdminClient().rpc("add_token_usage", {
    p_user_id: userId,
    p_tokens: tokens,
  });
}

export async function insertScan(row: {
  projectId: string;
  userId: string;
  commitSha: string;
}) {
  return createAdminClient()
    .from("scans")
    .insert({
      project_id: row.projectId,
      user_id: row.userId,
      commit_sha: row.commitSha,
    })
    .select("id")
    .single();
}

export async function enqueueScan(scanId: string) {
  return createAdminClient().rpc("enqueue_scan", { p_scan_id: scanId });
}

export async function readScanJobs(qty: number, visibilitySeconds: number) {
  return createAdminClient().rpc("read_scan_jobs", {
    p_qty: qty,
    p_visibility_seconds: visibilitySeconds,
  });
}

export async function ackScanJob(msgId: number) {
  return createAdminClient().rpc("ack_scan_job", { p_msg_id: msgId });
}

export async function archiveScanJob(msgId: number) {
  return createAdminClient().rpc("archive_scan_job", { p_msg_id: msgId });
}

export async function getScanForWorker(scanId: string) {
  return createAdminClient()
    .from("scans")
    .select(
      "id, user_id, status, commit_sha, projects(installation_id, repo_full_name, detected_stack)",
    )
    .eq("id", scanId)
    .maybeSingle();
}

export async function updateScan(scanId: string, patch: Update<"scans">) {
  return createAdminClient().from("scans").update(patch).eq("id", scanId);
}

/** 재시도해도 결과가 겹치지 않도록 스캔의 발견 항목을 통째로 바꾼다. */
export async function replaceFindings(
  scanId: string,
  rows: Insert<"findings">[],
) {
  const admin = createAdminClient();
  const { error } = await admin.from("findings").delete().eq("scan_id", scanId);
  if (error || rows.length === 0) return { error };
  return admin.from("findings").insert(rows);
}

export async function insertLlmCall(row: Insert<"llm_calls">) {
  return createAdminClient().from("llm_calls").insert(row);
}

export async function listProjectScans(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select(
      "id, project_id, status, progress, commit_sha, summary, error, created_at, finished_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(20);
}

export async function getMyScan(scanId: string) {
  const supabase = await createClient();
  return supabase
    .from("scans")
    .select(
      "id, project_id, status, progress, commit_sha, summary, error, created_at, finished_at",
    )
    .eq("id", scanId)
    .maybeSingle();
}

export async function listScanFindings(scanId: string) {
  const supabase = await createClient();
  return supabase
    .from("findings")
    .select(
      "id, rule_id, severity, file_path, line_start, line_end, snippet, ai_verdict, explanation, fix_prompt, status, rules(title)",
    )
    .eq("scan_id", scanId)
    .order("line_start");
}

export async function setFindingStatus(
  findingId: string,
  status: FindingStatus,
) {
  const supabase = await createClient();
  return supabase
    .from("findings")
    .update({ status })
    .eq("id", findingId)
    .select("id, status")
    .maybeSingle();
}

/** 직전 완료 스캔에서 사용자가 무시한 항목의 fingerprint. 새 스캔에 이어 준다. */
export async function listIgnoredFingerprintsBefore(scanId: string) {
  const admin = createAdminClient();
  const { data: previousId, error } = await admin.rpc("previous_scan_id", {
    p_scan_id: scanId,
  });
  if (error || !previousId) return { data: [] as string[], error };
  const result = await admin
    .from("findings")
    .select("fingerprint")
    .eq("scan_id", previousId)
    .eq("status", "ignored");
  return {
    data: (result.data ?? []).map((r) => r.fingerprint),
    error: result.error,
  };
}

export async function getPreviousScanId(scanId: string) {
  const supabase = await createClient();
  return supabase.rpc("previous_scan_id", { p_scan_id: scanId });
}

export async function getScanDiffRows(scanId: string) {
  const supabase = await createClient();
  return supabase.rpc("scan_diff", { p_scan_id: scanId });
}
