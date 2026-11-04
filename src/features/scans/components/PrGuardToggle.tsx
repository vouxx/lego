"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { setPrGuardAction } from "../actions";

type Props = { projectId: string; enabled: boolean };

export function PrGuardToggle({ projectId, enabled }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const result = await setPrGuardAction({ projectId, enabled: !enabled });
      if (result.ok) router.refresh();
      else setError(result.error.message);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={enabled ? "outline" : "default"}
        onClick={toggle}
        disabled={isPending}
      >
        {isPending ? "바꾸는 중…" : enabled ? "PR 가드 끄기" : "PR 가드 켜기"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
