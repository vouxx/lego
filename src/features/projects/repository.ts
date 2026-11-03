import "server-only";
import type { Insert } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 읽기는 사용자 세션(RLS), 쓰기는 secret 키. 쓰기 전 권한 확인은 services 가 한다.

export async function findInstallation(installationId: number) {
  return createAdminClient()
    .from("github_installations")
    .select("user_id")
    .eq("installation_id", installationId)
    .maybeSingle();
}

export async function upsertInstallation(row: {
  userId: string;
  installationId: number;
  accountLogin: string;
}) {
  return createAdminClient().from("github_installations").upsert(
    {
      user_id: row.userId,
      installation_id: row.installationId,
      account_login: row.accountLogin,
    },
    { onConflict: "installation_id" },
  );
}

export async function deleteInstallation(installationId: number) {
  return createAdminClient()
    .from("github_installations")
    .delete()
    .eq("installation_id", installationId);
}

export async function listMyInstallations() {
  const supabase = await createClient();
  return supabase
    .from("github_installations")
    .select("installation_id, account_login")
    .order("created_at");
}

export async function listMyProjects() {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, repo_full_name, default_branch, detected_stack, created_at")
    .order("created_at", { ascending: false });
}

export async function insertProject(row: {
  userId: string;
  /** null 이면 설치 없이 등록한 공개 리포 */
  installationId: number | null;
  repoFullName: string;
  defaultBranch: string;
  detectedStack: Insert<"projects">["detected_stack"];
}) {
  return createAdminClient()
    .from("projects")
    .insert({
      user_id: row.userId,
      installation_id: row.installationId,
      repo_full_name: row.repoFullName,
      default_branch: row.defaultBranch,
      detected_stack: row.detectedStack,
    })
    .select("id")
    .single();
}

export async function deleteProjectsByRepos(
  installationId: number,
  repoFullNames: string[],
) {
  return createAdminClient()
    .from("projects")
    .delete()
    .eq("installation_id", installationId)
    .in("repo_full_name", repoFullNames);
}

export async function getMyProject(projectId: string) {
  const supabase = await createClient();
  return supabase
    .from("projects")
    .select("id, repo_full_name, default_branch, detected_stack, created_at")
    .eq("id", projectId)
    .maybeSingle();
}
