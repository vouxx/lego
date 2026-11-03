"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { answerQuestionsAction } from "../actions";
import { useSpecGeneration } from "../hooks/useSpecGeneration";
import type { SpecQuestion } from "../schemas";
import { GenerationProgress } from "./GenerationProgress";

type Props = {
  specId: string;
  questions: SpecQuestion[];
  initialAnswers: Record<string, string>;
};

/** 확인 질문에 답하고 생성을 시작한다. 생성 중에는 단계별 진행을 보여준다. */
export function QuestionForm({ specId, questions, initialAnswers }: Props) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const generation = useSpecGeneration(specId);
  const set = (id: string, value: string) =>
    setAnswers((a) => ({ ...a, [id]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await answerQuestionsAction({ specId, answers });
      if (!result.ok) setError(result.error.message);
      else await generation.start();
    });
  };

  if (generation.running) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          스펙을 만들고 있습니다. 1~3분 걸리고, 탭을 닫아도 계속 만듭니다.
        </p>
        <GenerationProgress stages={generation.stages} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {questions.map((q) => (
        <fieldset key={q.id} className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">{q.question}</legend>
          <div className="flex flex-wrap gap-2">
            {q.options.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={answers[q.id] === option ? "default" : "outline"}
                aria-pressed={answers[q.id] === option}
                onClick={() => set(q.id, option)}
              >
                {option}
              </Button>
            ))}
          </div>
          {q.allowCustom ? (
            <Input
              aria-label={`${q.question} 직접 입력`}
              placeholder="직접 입력"
              maxLength={500}
              value={
                q.options.includes(answers[q.id] ?? "")
                  ? ""
                  : (answers[q.id] ?? "")
              }
              onChange={(e) => set(q.id, e.target.value)}
            />
          ) : null}
        </fieldset>
      ))}
      <Button type="submit" disabled={isPending}>
        스펙 만들기
      </Button>
      {error || generation.error ? (
        <p role="alert" className="text-destructive text-sm">
          {error ?? generation.error}
        </p>
      ) : null}
    </form>
  );
}
