import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 관리자 화면: 모든 사용자의 데이터를 모아 보므로 secret 키로 읽는다. 호출 전에 isAdmin 을 확인한다.

export async function getRuleFeedback() {
  return createAdminClient().rpc("rule_feedback");
}

/** /lego ignore 로 남긴 최근 이유. 커밋마다 같은 행이 반복되므로 넉넉히 읽어 서비스에서 줄인다. */
export async function listRecentIgnores(limit = 300) {
  return createAdminClient()
    .from("pr_review_findings")
    .select(
      "rule_id, rule_title, fingerprint, file_path, ignore_reason, ignored_by, created_at, pr_reviews(pr_number, projects(repo_full_name))",
    )
    .eq("state", "ignored")
    .order("created_at", { ascending: false })
    .limit(limit);
}
