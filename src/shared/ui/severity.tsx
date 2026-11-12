import { cn } from "@/shared/lib/cn";

export const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "치명적",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-sev-critical",
  high: "bg-sev-high",
  medium: "bg-sev-medium",
  low: "bg-sev-low",
};

type Props = {
  severity: Severity;
  showLabel?: boolean;
  /** 표·랜딩처럼 선 위주 화면에서는 네모 표식을 쓴다 */
  square?: boolean;
  className?: string;
};

/** 심각도 점 + 글자. 색만으로 구분하지 않도록 글자를 함께 쓴다(숨겨도 스크린 리더는 읽는다). */
export function SeverityMark({
  severity,
  showLabel = true,
  square = false,
  className,
}: Props) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
    >
      <span
        className={cn(
          "size-2",
          !square && "rounded-full",
          SEVERITY_DOT[severity],
        )}
        aria-hidden="true"
      />
      {showLabel ? (
        <span>{SEVERITY_LABELS[severity]}</span>
      ) : (
        <span className="sr-only">{SEVERITY_LABELS[severity]}</span>
      )}
    </span>
  );
}
