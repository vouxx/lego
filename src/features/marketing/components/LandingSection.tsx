import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { LandingContainer } from "./LandingContainer";

type Props = {
  id: string;
  titleId: string;
  /** 회색 바탕 구역 */
  muted?: boolean;
  children: ReactNode;
  className?: string;
};

/** 위 선으로 나뉘는 랜딩 구역. */
export function LandingSection({
  id,
  titleId,
  muted = false,
  children,
  className,
}: Props) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "scroll-mt-16 border-t",
        muted ? "bg-muted" : "bg-background",
      )}
    >
      <LandingContainer className={cn("py-20 sm:pt-26 sm:pb-24", className)}>
        {children}
      </LandingContainer>
    </section>
  );
}
