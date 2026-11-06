"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** 루트 레이아웃까지 실패했을 때의 화면. 레이아웃이 없으므로 html 부터 직접 그린다. */
export default function GlobalError({
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
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">문제가 생겼습니다</h1>
        <p>잠시 뒤 다시 시도해 주세요. 오류는 자동으로 기록됩니다.</p>
        <button type="button" className="underline" onClick={reset}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
