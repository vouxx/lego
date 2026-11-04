"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/shared/lib/cn";
import { setPrGuardStrictnessAction } from "../actions";
import { STRICTNESS, STRICTNESS_RULES, type Strictness } from "../schemas";

type Props = { projectId: string; strictness: Strictness; compact?: boolean };

/** PR 가드 엄격도 고르기: 엄격·보통·느슨 */
export function PrGuardStrictness({ projectId, strictness, compact }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(strictness);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const choose = (next: Strictness) => {
    if (next === current) return;
    const before = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await setPrGuardStrictnessAction({
        projectId,
        strictness: next,
      });
      if (result.ok) router.refresh();
      else {
        setCurrent(before);
        setError(result.error.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="PR 가드 엄격도"
        className="inline-flex w-fit rounded-md border p-0.5"
      >
        {STRICTNESS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={current === s}
            disabled={isPending}
            onClick={() => choose(s)}
            className={cn(
              "rounded px-3 py-1 text-sm transition-colors disabled:opacity-60",
              current === s
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {STRICTNESS_RULES[s].label}
          </button>
        ))}
      </div>
      {compact ? null : (
        <p className="text-muted-foreground text-xs">
          {STRICTNESS_RULES[current].description} 다음 커밋부터 적용됩니다.
        </p>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
