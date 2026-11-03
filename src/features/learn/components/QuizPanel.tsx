"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { submitQuizAction } from "../actions";
import type { ExplanationView, QuizResult } from "../schemas";

type Props = { quiz: NonNullable<ExplanationView["quiz"]> };

export function QuizPanel({ quiz }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(
    quiz.questions.map(() => null),
  );
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await submitQuizAction({
        quizId: quiz.id,
        answers: answers.map((a) => a ?? 9),
      });
      if (res.ok) {
        setResult(res.data);
        router.refresh();
      } else setError(res.error.message);
    });

  const retry = () => {
    setResult(null);
    setAnswers(quiz.questions.map(() => null));
  };

  return (
    <div className="flex flex-col gap-5">
      {quiz.questions.map((q, i) => {
        const r = result?.results[i];
        return (
          <fieldset key={i} className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">
              {i + 1}. {q.question}
            </legend>
            {q.options.map((option, j) => (
              <label
                key={j}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-2 text-sm",
                  r && j === r.answerIndex && "border-primary bg-primary/5",
                  r &&
                    !r.correct &&
                    answers[i] === j &&
                    "border-destructive bg-destructive/5",
                )}
              >
                <input
                  type="radio"
                  name={`q${i}`}
                  className="mt-0.5"
                  disabled={Boolean(result)}
                  checked={answers[i] === j}
                  onChange={() =>
                    setAnswers((a) => a.map((v, k) => (k === i ? j : v)))
                  }
                />
                {option}
              </label>
            ))}
            {r ? (
              <p className="text-sm">
                <strong>{r.correct ? "정답" : "오답"}</strong> · {r.explanation}
              </p>
            ) : null}
          </fieldset>
        );
      })}
      {result ? (
        <div className="flex items-center gap-3">
          <p className="font-semibold">
            {Math.round(result.score * quiz.questions.length)}/
            {quiz.questions.length} 맞힘
          </p>
          <Button variant="outline" size="sm" onClick={retry}>
            다시 풀기
          </Button>
        </div>
      ) : (
        <Button
          onClick={submit}
          disabled={isPending || answers.some((a) => a === null)}
          className="self-start"
        >
          채점하기
        </Button>
      )}
      {quiz.lastScore !== null && !result ? (
        <p className="text-muted-foreground text-xs">
          지난번 {Math.round(quiz.lastScore * 100)}점
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
