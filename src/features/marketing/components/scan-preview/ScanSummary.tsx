import { SeverityMark } from "@/shared/ui/severity";
import { SCAN_PREVIEW } from "../../content";
import { TrendBars } from "./TrendBars";

/** 요약 칸: 남은 문제, 등급별 수, 최근 8회 막대. */
export function ScanSummary() {
  return (
    <div className="bg-background flex flex-wrap rounded-md border">
      <div className="flex-1 basis-36 border-r px-5 py-4">
        <p className="text-muted-foreground text-xs">남은 문제</p>
        <p className="mt-1 font-mono text-3xl font-medium">
          {SCAN_PREVIEW.open}
        </p>
        <p className="text-muted-foreground text-xs">{SCAN_PREVIEW.delta}</p>
      </div>
      {SCAN_PREVIEW.counts.map((c) => (
        <div key={c.severity} className="flex-1 basis-24 border-r px-5 py-4">
          <SeverityMark
            severity={c.severity}
            square
            className="text-muted-foreground text-xs"
          />
          <p className="mt-1 font-mono text-3xl font-medium">{c.count}</p>
        </div>
      ))}
      <div className="flex flex-2 basis-60 flex-col gap-2 px-5 py-4">
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>최근 8회 남은 문제</span>
          <span>{SCAN_PREVIEW.medianFix}</span>
        </div>
        <TrendBars values={SCAN_PREVIEW.trend} />
      </div>
    </div>
  );
}
