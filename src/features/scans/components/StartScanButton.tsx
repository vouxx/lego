"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { startScanAction } from "../actions";

type Props = { projectId: string };

export function StartScanButton({ projectId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const start = () => {
    setError(null);
    startTransition(async () => {
      const result = await startScanAction({ projectId });
      if (result.ok)
        router.push(`/projects/${projectId}/scans/${result.data.scanId}`);
      else setError(result.error.message);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={start} disabled={isPending}>
        {isPending ? "시작하는 중…" : "보안 점검 시작"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
