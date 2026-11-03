"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/shared/ui/button";
import { openContextPrAction } from "../actions";
import type { PrAvailability } from "../schemas";

type Props = {
  contextFileId: string;
  pr: PrAvailability;
  /** 저장하지 않은 변경이 있으면 PR 을 만들 수 없다 */
  dirty: boolean;
};

export function PrButton({ contextFileId, pr, dirty }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (pr.status === "public_repo") {
    return (
      <p className="text-muted-foreground text-xs">
        주소로 등록한 공개 리포는 PR 대신 내려받기로 추가해 주세요.
      </p>
    );
  }
  if (pr.status === "needs_permission") {
    return (
      <div className="flex flex-col gap-1">
        <a
          href={pr.settingsUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          PR 만들기 권한 허용하기 <ExternalLink />
        </a>
        <p className="text-muted-foreground text-xs">
          GitHub 에서 레고가 브랜치를 만들고 PR 을 열 수 있게 승인해 주세요.
        </p>
      </div>
    );
  }

  const open = () => {
    setError(null);
    startTransition(async () => {
      const result = await openContextPrAction({ contextFileId });
      if (result.ok) {
        setPrUrl(result.data.prUrl);
        router.refresh();
      } else setError(result.error.message);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={open} disabled={isPending || dirty}>
        {isPending ? "PR 만드는 중…" : "GitHub PR 만들기"}
      </Button>
      {dirty ? (
        <p className="text-muted-foreground text-xs">먼저 저장해 주세요.</p>
      ) : null}
      {prUrl ? (
        <a
          href={prUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          만든 PR 열기 ↗
        </a>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
