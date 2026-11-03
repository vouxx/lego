"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { generateContextAction } from "../actions";
import type { ContextTarget } from "../schemas";

type Props = {
  projectId: string;
  target: ContextTarget;
  label: string;
  variant?: "default" | "outline";
};

export function GenerateContextButton({
  projectId,
  target,
  label,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateContextAction({ projectId, target });
      if (result.ok) router.refresh();
      else setError(result.error.message);
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={generate} disabled={isPending} variant={variant}>
        {isPending ? "리포를 분석하는 중… (최대 1분)" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
