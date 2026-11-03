"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { addPublicRepoAction } from "../actions";

export function PublicRepoForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addPublicRepoAction({ url });
      if (result.ok) router.push(`/projects/${result.data.projectId}`);
      else setError(result.error.message);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/내아이디/리포"
          aria-label="공개 리포 주소"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || url.trim() === ""}>
          {isPending ? "확인하는 중…" : "추가"}
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
