import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = { children: ReactNode; className?: string };

/** 랜딩의 가로 폭(1120px)과 좌우 여백. */
export function LandingContainer({ children, className }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-280 px-5 sm:px-10", className)}>
      {children}
    </div>
  );
}
