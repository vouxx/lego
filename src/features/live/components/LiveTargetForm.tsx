"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createLiveTargetAction } from "../actions";

type Props = { projectId: string; current?: string };

export function LiveTargetForm({ projectId, current = "" }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createLiveTargetAction({ projectId, siteUrl: url });
      if (result.ok) router.refresh();
      else setError(result.error.message);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://내앱.vercel.app"
          aria-label="배포 주소"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || url.trim() === ""}>
          {isPending ? "확인하는 중…" : current ? "주소 바꾸기" : "등록"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </form>
  );
}
