"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { acceptInviteAction } from "../actions";

type Props = { token: string };

export function AcceptInviteButton({ token }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const accept = () =>
    startTransition(async () => {
      setError(null);
      const result = await acceptInviteAction({ token });
      if (result.ok) router.push(`/projects/${result.data.projectId}`);
      else setError(result.error.message);
    });

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={accept} disabled={isPending} className="w-fit">
        초대 수락
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
