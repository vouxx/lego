import { cn } from "@/shared/lib/cn";
import { SEVERITY_LABELS, type Severity } from "../content";

const DOT: Record<Severity, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  medium: "bg-sev-medium",
  low: "bg-sev-low",
};

type Props = { severity: Severity; showLabel?: boolean };

/** 심각도 점. 색만으로 구분하지 않도록 글자도 같이 붙일 수 있다. */
export function SeverityMark({ severity, showLabel = true }: Props) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span
        className={cn("size-2 rounded-full", DOT[severity])}
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="w-10">{SEVERITY_LABELS[severity]}</span>
      ) : (
        <span className="sr-only">{SEVERITY_LABELS[severity]}</span>
      )}
    </span>
  );
}
