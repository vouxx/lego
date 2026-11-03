"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { explainFindingAction } from "../actions";
import type { Level } from "../schemas";
import { LevelSelect } from "./LevelSelect";

type Props = { findingId: string };

/** 보안 점검 발견 항목 → 설명 → 퀴즈로 이어지는 입구. 수준을 고르고 직접 시작한다. */
export function ExplainFindingStarter({ findingId }: Props) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>("beginner");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = () =>
    startTransition(async () => {
      setError(null);
      const result = await explainFindingAction({ findingId, level });
      if (result.ok) router.push(`/learn/${result.data.explanationId}`);
      else setError(result.error.message);
    });

  return (
    <div className="flex flex-col gap-4">
      <LevelSelect value={level} onChange={setLevel} />
      <Button onClick={start} disabled={isPending} className="self-start">
        {isPending ? "설명을 만드는 중… (20~40초)" : "이 문제 설명 듣기"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
