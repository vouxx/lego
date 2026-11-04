"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/shared/lib/result";
import { Button } from "@/shared/ui/button";

type Props = {
  /** 인자를 bind 한 Server Action */
  action: () => Promise<Result<unknown>>;
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
};

/** 운영 점검 화면의 버튼(소유 확인, 지금 점검). 실패하면 이유를 보여 준다. */
export function LiveActionButton({
  action,
  label,
  pendingLabel,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error.message);
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant={variant} onClick={run} disabled={isPending}>
        {isPending ? pendingLabel : label}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
