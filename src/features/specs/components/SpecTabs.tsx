"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = { tabs: { id: string; label: string; content: ReactNode }[] };

export function SpecTabs({ tabs }: Props) {
  const [current, setCurrent] = useState(tabs[0]?.id);
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={current === t.id}
            onClick={() => setCurrent(t.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              current === t.id
                ? "border-primary font-medium"
                : "text-muted-foreground border-transparent",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === current)?.content}
    </div>
  );
}
