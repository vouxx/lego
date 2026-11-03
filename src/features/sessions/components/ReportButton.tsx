"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { reportSessionAction } from "../actions";

export function ReportButton({ sessionId }: { sessionId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const report = () => {
    const reason = window.prompt(
      "신고 이유를 적어 주세요(비밀값 노출, 부적절한 내용 등)",
    );
    if (!reason?.trim()) return;
    startTransition(async () => {
      const result = await reportSessionAction({ sessionId, reason });
      setNote(
        result.ok
          ? "신고했습니다. 검토 전까지 반영되지 않을 수 있습니다."
          : result.error.message,
      );
    });
  };
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={report}
        disabled={isPending || Boolean(note)}
      >
        신고
      </Button>
      {note ? (
        <span className="text-muted-foreground text-xs">{note}</span>
      ) : null}
    </div>
  );
}
