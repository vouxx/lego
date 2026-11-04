import "server-only";
import { cacheLife } from "next/cache";
import { getConcept, listConcepts, listRuleTitles } from "../repository";

/** 공개 개념 사전. 로그인과 무관한 데이터라 캐시한다. */
export async function getConceptList() {
  "use cache";
  cacheLife("hours");
  const { data } = await listConcepts();
  return (data ?? []).map((c) => ({
    slug: c.slug,
    title: c.title,
    summary: c.summary,
    ruleIds: c.related_rule_ids,
  }));
}

export async function getConceptPage(slug: string) {
  "use cache";
  cacheLife("hours");
  const { data: concept } = await getConcept(slug);
  if (!concept) return null;
  const { data: rules } = await listRuleTitles(concept.related_rule_ids);
  return {
    slug: concept.slug,
    title: concept.title,
    summary: concept.summary,
    body: concept.body_md,
    rules: (rules ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      severity: r.severity,
    })),
  };
}

/** 점검 결과의 '이게 뭐예요?' 링크: 규칙과 연결된 첫 개념. 없으면 null. */
export async function conceptSlugForRule(ruleId: string) {
  const concepts = await getConceptList();
  return concepts.find((c) => c.ruleIds.includes(ruleId))?.slug ?? null;
}
