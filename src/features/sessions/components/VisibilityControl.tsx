"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { setVisibilityAction } from "../actions";
import { VISIBILITIES, VISIBILITY_LABELS, type Visibility } from "../schemas";

type Props = {
  sessionId: string;
  visibility: Visibility;
  slug: string | null;
  disabled: boolean;
};

export function VisibilityControl({
  sessionId,
  visibility,
  slug,
  disabled,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const sharePath = slug && visibility !== "private" ? `/s/${slug}` : null;
  const copy = async () => {
    if (!sharePath) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${sharePath}`,
    );
    setCopied(true);
  };

  const change = (next: Visibility) =>
    startTransition(async () => {
      setError(null);
      const result = await setVisibilityAction({ sessionId, visibility: next });
      if (result.ok) router.refresh();
      else setError(result.error.message);
    });

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2">
        <span className="font-semibold">공개 범위</span>
        <select
          value={visibility}
          disabled={disabled || isPending}
          onChange={(e) => change(e.target.value as Visibility)}
          className="bg-background rounded-md border p-1.5"
        >
          {VISIBILITIES.map((v) => (
            <option key={v} value={v}>
              {VISIBILITY_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      {sharePath ? (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sharePath}
            className="break-all underline"
            target="_blank"
            rel="noreferrer"
          >
            {sharePath}
          </a>
          <Button size="xs" variant="outline" onClick={copy}>
            {copied ? "복사됨" : "링크 복사"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  );
}
