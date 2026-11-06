"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">문제가 생겼습니다</h1>
      <p className="text-muted-foreground text-sm">
        잠시 뒤 다시 시도해 주세요. 오류는 자동으로 기록됩니다.
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </main>
  );
}
