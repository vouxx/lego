"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { MarkdownPreview } from "@/shared/ui/markdown-preview";
import { updatePrdAction } from "../actions";

type Props = { specId: string; prd: string };

export function PrdEditor({ specId, prd }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(prd);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await updatePrdAction({ specId, prd: value });
      if (!result.ok) setError(result.error.message);
      else {
        setEditing(false);
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={isPending}>
              저장
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setValue(prd);
                setEditing(false);
              }}
            >
              취소
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            PRD 고치기
          </Button>
        )}
      </div>
      {editing ? (
        <textarea
          aria-label="PRD 편집"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="bg-background min-h-[28rem] rounded-md border p-3 font-mono text-xs leading-relaxed"
        />
      ) : (
        <MarkdownPreview content={value} />
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
