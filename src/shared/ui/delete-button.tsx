"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/shared/lib/result";
import { Button } from "./button";

type Props = {
  /** 지우는 Server Action(인자를 bind 해서 넘긴다) */
  action: () => Promise<Result<null>>;
  /** 지운 뒤 이동할 곳 */
  redirectTo: string;
  label: string;
  /** 확인 창 문구. 무엇이 같이 지워지는지 적는다 */
  confirmText: string;
};

/** 확인 창을 띄우고 지운 뒤 목록으로 돌아가는 버튼. 실패하면 이유를 보여 준다. */
export function DeleteButton({
  action,
  redirectTo,
  label,
  confirmText,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remove = () => {
    if (!window.confirm(`${confirmText}\n되돌릴 수 없습니다.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.push(redirectTo);
        router.refresh();
      } else setError(result.error.message);
    });
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="destructive"
        onClick={remove}
        disabled={isPending}
      >
        <Trash2 />
        {isPending ? "지우는 중…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
    </span>
  );
}
