"use client";

import { Button } from "@/shared/ui/button";
import { useSpecGeneration } from "../hooks/useSpecGeneration";
import { GenerationProgress } from "./GenerationProgress";

type Props = {
  specId: string;
  message: string;
  progress: Record<string, string>;
  /** 다시 만들기 버튼을 보여줄지(생성 중이면 오래된 경우만) */
  canRetry: boolean;
};

/** 생성 중·실패 상태. 진행 기록을 보여주고 다시 만들 수 있게 한다. */
export function RetryGeneration({
  specId,
  message,
  progress,
  canRetry,
}: Props) {
  const generation = useSpecGeneration(specId);
  const stages = generation.running ? generation.stages : progress;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {generation.running ? "다시 만들고 있습니다…" : message}
      </p>
      <GenerationProgress stages={stages} />
      {canRetry && !generation.running ? (
        <Button onClick={generation.start} className="self-start">
          다시 만들기
        </Button>
      ) : null}
      {generation.error ? (
        <p role="alert" className="text-destructive text-sm">
          {generation.error}
        </p>
      ) : null}
    </div>
  );
}
