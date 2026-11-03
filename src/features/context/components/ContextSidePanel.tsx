"use client";

import { useState } from "react";
import { cn } from "@/shared/lib/cn";
import { MarkdownPreview } from "./MarkdownPreview";
import { VersionDiff } from "./VersionDiff";

type Props = {
  content: string;
  savedContent: string;
  previousContent: string | null;
  dirty: boolean;
};

const TABS = [
  { id: "preview", label: "미리보기" },
  { id: "diff", label: "변경 비교" },
] as const;

export function ContextSidePanel({
  content,
  savedContent,
  previousContent,
  dirty,
}: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("preview");

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-sm",
              tab === t.id
                ? "border-primary font-medium"
                : "text-muted-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "preview" ? (
        <MarkdownPreview content={content} />
      ) : (
        <VersionDiff
          before={dirty ? savedContent : previousContent}
          after={content}
          beforeLabel={dirty ? "저장된 버전" : "이전 버전"}
        />
      )}
    </div>
  );
}
