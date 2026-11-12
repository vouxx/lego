import { cn } from "@/shared/lib/cn";
import { PREVIEW_FINDINGS, SCAN_PREVIEW } from "../../content";
import { FindingRow } from "./FindingRow";

/** 발견 항목 표. 첫 줄이 선택된 상태. */
export function FindingsTable() {
  return (
    <div className="bg-background max-w-full min-w-0 flex-999 basis-130 rounded-md border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 text-sm">
        <div className="flex gap-1">
          {SCAN_PREVIEW.tabs.map((tab, i) => (
            <span
              key={tab}
              className={cn(
                "rounded-sm border px-3 py-1.5",
                i === 0
                  ? "border-input font-medium"
                  : "text-muted-foreground border-transparent",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <span className="text-muted-foreground ml-auto hidden items-center gap-2 sm:flex">
          등급
          <span className="text-foreground border-input rounded-sm border px-2.5 py-1.5">
            전체 ▾
          </span>
        </span>
      </div>
      <div className="overflow-hidden">
        <table className="w-full min-w-130 border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="w-16 px-4 py-2.5 font-medium">등급</th>
              <th className="px-2 py-2.5 font-medium">발견 항목</th>
              <th className="w-16 px-2 py-2.5 font-medium">판별</th>
              <th className="w-19 py-2.5 pr-4 pl-2 font-medium">처음 발견</th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_FINDINGS.map((f, i) => (
              <FindingRow key={f.id} finding={f} selected={i === 0} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground px-4 py-3 text-xs">
        {SCAN_PREVIEW.dependencyNote}
      </p>
    </div>
  );
}
