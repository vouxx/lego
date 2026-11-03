import "server-only";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  getConcept,
  getMyExplanation,
  listConcepts,
  listMyExplanations,
  listMyMastery,
  listMyProjects,
  listRuleTitles,
} from "../repository";
import {
  explanationContentSchema,
  LEVELS,
  quizQuestionSchema,
  type ExplanationView,
  type Level,
  type MasteryView,
} from "../schemas";

const toLevel = (v: string): Level =>
  (LEVELS as readonly string[]).includes(v) ? (v as Level) : "beginner";

export async function getExplanationView(
  explanationId: string,
): Promise<Result<ExplanationView>> {
  const { data: row } = await getMyExplanation(explanationId);
  if (!row) return err("not_found", "설명을 찾을 수 없습니다.");
  const content = explanationContentSchema.safeParse(row.content);
  if (!content.success) return err("bad_content", "설명 형식이 다릅니다.");

  const { data: concepts } = await listConcepts();
  const cards = (concepts ?? [])
    .filter((c) => content.data.conceptSlugs.includes(c.slug))
    .map((c) => ({ slug: c.slug, title: c.title, summary: c.summary }));

  const quiz = row.quizzes;
  const questions = z
    .array(quizQuestionSchema)
    .catch([])
    .parse(quiz?.questions);
  const attempts = [...(quiz?.quiz_attempts ?? [])].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  return ok({
    id: row.id,
    level: toLevel(row.level),
    source: row.source as ExplanationView["source"],
    sourceRef: row.source_ref,
    code: row.code,
    language: row.language,
    content: content.data,
    concepts: cards,
    // 정답과 해설은 채점할 때만 서버가 돌려준다.
    quiz:
      quiz && questions.length > 0
        ? {
            id: quiz.id,
            questions: questions.map(({ question, options }) => ({
              question,
              options,
            })),
            lastScore: attempts[0] ? Number(attempts[0].score) : null,
          }
        : null,
    createdAt: row.created_at,
  });
}

export async function getLearningHome() {
  const [explanations, mastery, projects] = await Promise.all([
    listMyExplanations(),
    listMyMastery(),
    listMyProjects(),
  ]);
  return {
    explanations: (explanations.data ?? []).map((e) => ({
      id: e.id,
      level: toLevel(e.level),
      source: e.source,
      sourceRef: e.source_ref,
      summary:
        explanationContentSchema.safeParse(e.content).data?.summary ?? "",
      createdAt: e.created_at,
    })),
    mastery: (mastery.data ?? []).map((m): MasteryView => ({
      slug: m.concept_slug,
      title: m.concepts?.title ?? m.concept_slug,
      mastery: m.mastery,
      lastSeenAt: m.last_seen_at,
    })),
    projects: (projects.data ?? []).map((p) => ({
      id: p.id,
      name: p.repo_full_name,
    })),
  };
}

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
