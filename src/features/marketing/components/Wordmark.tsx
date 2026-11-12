import { cn } from "@/shared/lib/cn";

/** 네 칸 블록 표식 + LEGO 글자. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="text-foreground"
      >
        <rect x="1" y="1" width="8" height="8" fill="currentColor" />
        <rect
          x="11"
          y="1"
          width="8"
          height="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect
          x="1"
          y="11"
          width="8"
          height="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <rect x="11" y="11" width="8" height="8" fill="currentColor" />
      </svg>
      <span className="font-mono text-sm font-medium tracking-widest">
        LEGO
      </span>
    </span>
  );
}
