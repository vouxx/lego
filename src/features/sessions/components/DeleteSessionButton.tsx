"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { deleteSessionAction } from "../actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const remove = () => {
    if (!window.confirm("세션과 올린 파일을 지웁니다. 되돌릴 수 없습니다."))
      return;
    startTransition(async () => {
      const result = await deleteSessionAction({ sessionId });
      if (result.ok) router.push("/sessions");
    });
  };
  return (
    <Button
      size="sm"
      variant="destructive"
      onClick={remove}
      disabled={isPending}
    >
      세션 지우기
    </Button>
  );
}
