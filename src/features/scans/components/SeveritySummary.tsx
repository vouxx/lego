import { SeverityMark } from "@/shared/ui/severity";
import { StatGrid } from "@/shared/ui/stat-grid";
import { SEVERITIES, type ScanSummary } from "../schemas";

type Props = { summary: ScanSummary };

export function SeveritySummary({ summary }: Props) {
  const meta = [
    `파일 ${summary.filesScanned}개 검사${summary.truncated ? "(파일이 많아 일부만)" : ""}`,
    summary.falsePositives > 0
      ? `AI 가 오탐으로 판단해 숨긴 항목 ${summary.falsePositives}개`
      : null,
    summary.costUsd > 0 ? `AI 비용 $${summary.costUsd.toFixed(4)}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <StatGrid
        items={SEVERITIES.map((severity) => ({
          label: <SeverityMark severity={severity} />,
          value: summary.bySeverity[severity] ?? 0,
        }))}
      />
      <p className="text-muted-foreground font-mono text-xs">
        {meta.join(" · ")}
      </p>
      {summary.llmNote ? (
        <p className="text-muted-foreground text-sm">⚠ {summary.llmNote}</p>
      ) : null}
      {summary.dependencyNote ? (
        <p className="text-muted-foreground text-sm">
          ⚠ {summary.dependencyNote}
        </p>
      ) : null}
    </div>
  );
}
