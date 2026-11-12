import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = { id: string; children: ReactNode; className?: string };

/** 구역 제목(h2). 머리글 없이 문장 하나로 쓴다. */
export function SectionTitle({ id, children, className }: Props) {
  return (
    <h2
      id={id}
      className={cn(
        "text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-3xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}
