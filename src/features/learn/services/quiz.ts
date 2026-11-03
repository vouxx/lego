import "server-only";
import { z } from "zod";
import type { CurrentUser } from "@/lib/auth";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  getMasteryRows,
  getMyQuiz,
  insertQuizAttempt,
  upsertMastery,
} from "../repository";
import {
  explanationContentSchema,
  quizQuestionSchema,
  type QuizResult,
} from "../schemas";
import { gradeQuiz, nextMastery } from "./grading";

/** 채점하고, 설명에 연결된 개념들의 숙련도를 갱신한다. */
export async function submitQuiz(
  user: CurrentUser,
  input: { quizId: string; answers: number[] },
): Promise<Result<QuizResult>> {
  const { data: quiz } = await getMyQuiz(input.quizId);
  if (!quiz) return err("not_found", "퀴즈를 찾을 수 없습니다.");
  const questions = z.array(quizQuestionSchema).catch([]).parse(quiz.questions);
  const result = gradeQuiz(questions, input.answers);

  const { error } = await insertQuizAttempt({
    quiz_id: quiz.id,
    user_id: user.id,
    answers: input.answers,
    score: result.score,
  });
  if (error) return err("db_error", "결과를 저장하지 못했습니다.");

  const content = explanationContentSchema.safeParse(
    quiz.explanations?.content,
  );
  const slugs = content.success ? content.data.conceptSlugs : [];
  const { data: rows } = await getMasteryRows(user.id, slugs);
  const previous = new Map(
    (rows ?? []).map((r) => [r.concept_slug, r.mastery]),
  );
  await upsertMastery(
    slugs.map((slug) => ({
      user_id: user.id,
      concept_slug: slug,
      mastery: nextMastery(previous.get(slug) ?? null, result.score),
      last_seen_at: new Date().toISOString(),
    })),
  );
  return ok(result);
}
