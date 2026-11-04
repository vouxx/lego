import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 개념 사전은 공개 데이터라 로그인 없이도 secret 키로 읽는다(anon 에 lego 스키마를 열지 않는다).

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
