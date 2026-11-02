import { SEVERITIES, type ScanSummary } from "../schemas";
import { SeverityBadge } from "./SeverityBadge";

type Props = { summary: ScanSummary };

export function SeveritySummary({ summary }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap items-center gap-3">
        {SEVERITIES.map((severity) => (
          <li key={severity} className="flex items-center gap-1.5 text-sm">
            <SeverityBadge severity={severity} />
            <span className="font-medium">
              {summary.bySeverity[severity] ?? 0}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        파일 {summary.filesScanned}개 검사
        {summary.truncated ? " (파일이 많아 일부만 검사)" : ""}
        {summary.falsePositives > 0
          ? ` · AI가 오탐으로 판단한 항목 ${summary.falsePositives}개 숨김`
          : ""}
        {summary.costUsd > 0 ? ` · AI 비용 $${summary.costUsd.toFixed(4)}` : ""}
      </p>
      {summary.llmNote ? (
        <p className="text-muted-foreground text-sm">⚠ {summary.llmNote}</p>
      ) : null}
    </div>
  );
}
