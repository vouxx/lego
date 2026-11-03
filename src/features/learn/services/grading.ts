import type { QuizQuestion, QuizResult } from "../schemas";

/** 채점. 답하지 않은 문항은 틀린 것으로 본다. */
export function gradeQuiz(
  questions: QuizQuestion[],
  answers: number[],
): QuizResult {
  const results = questions.map((q, i) => ({
    correct: answers[i] === q.answerIndex,
    answerIndex: q.answerIndex,
    explanation: q.explanation,
  }));
  const correct = results.filter((r) => r.correct).length;
  return {
    score: questions.length === 0 ? 0 : correct / questions.length,
    results,
  };
}

/**
 * 숙련도(0~100). 처음 푼 개념은 점수 그대로, 이미 있으면 이전 값 60% + 이번 점수 40%.
 * 한 번 잘 맞혔다고 바로 100 이 되지 않고, 여러 번 맞혀야 올라간다.
 */
export function nextMastery(previous: number | null, score: number) {
  const now = Math.round(score * 100);
  if (previous === null) return now;
  return Math.round(previous * 0.6 + now * 0.4);
}

/** 모델이 준 퀴즈를 검사한다. 보기 2~5개, 정답 번호가 범위 안인 문항만 3개까지 남긴다. */
export function sanitizeQuiz(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .filter(
      (q) =>
        q.question.trim() &&
        q.options.length >= 2 &&
        q.options.length <= 5 &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length,
    )
    .slice(0, 3);
}

/** 코드 언어를 파일 확장자로 짐작한다(코드 하이라이트·LLM 힌트용). */
export function guessLanguage(path: string | null): string | null {
  const ext = path?.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    mjs: "javascript",
    sql: "sql",
    py: "python",
    json: "json",
    css: "css",
  };
  return ext ? (map[ext] ?? null) : null;
}

/** 파일 내용에서 줄 범위를 자른다(1부터, 끝 줄 포함). */
export function sliceLines(content: string, start: number, end: number) {
  return content
    .split("\n")
    .slice(start - 1, end)
    .join("\n");
}
