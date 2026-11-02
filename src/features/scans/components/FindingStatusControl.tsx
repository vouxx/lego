"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { updateFindingStatusAction } from "../actions";
import type { FindingStatus } from "../schemas";

type Props = { findingId: string; status: FindingStatus };

export function FindingStatusControl({ findingId, status: initial }: Props) {
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const change = (next: FindingStatus) => {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const result = await updateFindingStatusAction({
        findingId,
        status: next,
      });
      if (!result.ok) {
        setStatus(previous);
        setError(result.error.message);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {status === "open" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => change("resolved")}
          >
            해결함
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => change("ignored")}
          >
            무시
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground text-sm">
            {status === "resolved" ? "해결함" : "무시함"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => change("open")}
          >
            되돌리기
          </Button>
        </>
      )}
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </div>
  );
}
