"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { saveInsightTemplateAction } from "../actions";

type Props = { insightId: string; label?: string };

export function SaveTemplateButton({
  insightId,
  label = "내 템플릿으로 저장",
}: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = () =>
    startTransition(async () => {
      const result = await saveInsightTemplateAction({ insightId });
      setNote(
        result.ok
          ? "저장했습니다. 다음 스펙의 작업 프롬프트에 예시로 쓰입니다."
          : result.error.message,
      );
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="xs"
        variant="outline"
        onClick={save}
        disabled={isPending || Boolean(note)}
      >
        {label}
      </Button>
      {note ? (
        <span className="text-muted-foreground text-xs">{note}</span>
      ) : null}
    </div>
  );
}
