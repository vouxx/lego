"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { retryAnalysisAction } from "../actions";

type Props = {
  sessionId: string;
  status: string;
  error: string | null;
  canRetry: boolean;
};

const POLL_MS = 5_000;

/** 분석 대기·진행 중이면 5초마다 새로 읽고, 실패하거나 멈추면 다시 분석할 수 있게 한다. */
export function SessionStatusPanel({
  sessionId,
  status,
  error,
  canRetry,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const running = status === "queued" || status === "analyzing";

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, router]);

  if (status === "done") return null;

  const retry = () =>
    startTransition(async () => {
      const result = await retryAnalysisAction({ sessionId });
      if (result.ok) router.refresh();
      else setMessage(result.error.message);
    });

  return (
    <div
      role="status"
      className="bg-muted flex flex-col gap-2 rounded-md p-4 text-sm"
    >
      {running ? (
        <p className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          세션을 분석하고 있습니다(보통 30초~1분).
        </p>
      ) : (
        <p>{error ?? "분석하지 못했습니다."}</p>
      )}
      {canRetry ? (
        <Button
          size="sm"
          variant="outline"
          onClick={retry}
          disabled={isPending}
          className="self-start"
        >
          다시 분석
        </Button>
      ) : null}
      {message ? <p className="text-destructive">{message}</p> : null}
    </div>
  );
}
