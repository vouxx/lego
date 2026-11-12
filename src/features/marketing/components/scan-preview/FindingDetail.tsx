import { SeverityMark } from "@/shared/ui/severity";
import { PREVIEW_DETAIL, PREVIEW_FINDINGS } from "../../content";
import { DetailCode } from "./DetailCode";

/** 선택한 항목의 상세 칸: 코드, 왜 위험한가, 수정 지시. */
export function FindingDetail() {
  const f = PREVIEW_FINDINGS[0];
  if (!f) return null;
  return (
    <div className="bg-background flex min-w-0 flex-1 basis-95 flex-col rounded-md border">
      <div className="flex flex-col gap-2 border-b px-5 py-4">
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <SeverityMark severity={f.severity} square />
          <span className="font-mono">{f.id}</span>
          <span>· {PREVIEW_DETAIL.basis}</span>
        </p>
        <p className="text-base leading-snug font-semibold">{f.title}</p>
        <p className="text-muted-foreground font-mono text-xs">{f.where}</p>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4">
        <DetailCode lines={PREVIEW_DETAIL.code} />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">왜 위험한가</p>
          <p className="text-sm leading-relaxed">{PREVIEW_DETAIL.why}</p>
          <span className="text-sm font-medium underline">
            {PREVIEW_DETAIL.concept}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">수정 지시</p>
            <span className="rounded-sm border px-3 py-1.5 text-xs font-medium">
              복사
            </span>
          </div>
          <pre className="bg-muted rounded-sm border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {PREVIEW_DETAIL.fix}
          </pre>
        </div>
      </div>
    </div>
  );
}
