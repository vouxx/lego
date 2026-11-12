import { SCAN_PREVIEW } from "../../content";

/** 모형 제목 줄: 점검 번호, 커밋·시간, 비교·다시 점검 버튼 모양. */
export function PreviewTitle() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-xl font-semibold">{SCAN_PREVIEW.title}</p>
        <p className="text-muted-foreground font-mono text-xs">
          {SCAN_PREVIEW.meta}
        </p>
      </div>
      <div className="flex gap-2 text-sm font-medium">
        <span className="bg-background rounded-sm border px-3.5 py-2">
          #13 과 비교
        </span>
        <span className="bg-primary text-primary-foreground rounded-sm px-4 py-2">
          다시 점검
        </span>
      </div>
    </div>
  );
}
