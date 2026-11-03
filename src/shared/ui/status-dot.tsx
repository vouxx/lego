import { cn } from "@/shared/lib/cn";

export type StatusTone = "ok" | "busy" | "danger" | "muted";

const TONE: Record<StatusTone, string> = {
  ok: "bg-ok",
  busy: "bg-sev-medium animate-pulse",
  danger: "bg-sev-critical",
  muted: "bg-muted-foreground/50",
};

type Props = { tone: StatusTone; label: string; className?: string };

/** 상태 표시(완료·진행 중·실패·대기). 고정폭 글자와 점 하나. */
export function StatusDot({ tone, label, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 font-mono text-xs",
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", TONE[tone])}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
