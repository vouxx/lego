import { SCAN_PREVIEW } from "../../content";
import { Wordmark } from "../Wordmark";

/** 모형 상단: 표식, 프로젝트 이름, 이번 달 점검 횟수, 계정. */
export function PreviewHeader() {
  return (
    <div className="bg-background flex min-h-13 items-center gap-x-6 gap-y-3 border-b px-6">
      <Wordmark />
      <span className="text-muted-foreground" aria-hidden="true">
        /
      </span>
      <span className="text-sm font-medium">{SCAN_PREVIEW.project} ▾</span>
      <span className="text-muted-foreground ml-auto hidden text-sm sm:inline">
        {SCAN_PREVIEW.quota}
      </span>
      <span className="bg-secondary flex size-8 items-center justify-center rounded-full border font-mono text-xs">
        ZE
      </span>
    </div>
  );
}
