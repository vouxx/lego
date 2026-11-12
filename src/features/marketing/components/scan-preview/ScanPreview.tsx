import { FindingDetail } from "./FindingDetail";
import { FindingsTable } from "./FindingsTable";
import { PreviewHeader } from "./PreviewHeader";
import { PreviewMenu } from "./PreviewMenu";
import { PreviewTitle } from "./PreviewTitle";
import { ScanSummary } from "./ScanSummary";

/**
 * 히어로에 넣는 점검 결과 화면 모형. 표시 전용이라 누를 수 있는 것이 없고(inert),
 * 화면 읽기 프로그램에는 그림 하나로 알린다.
 */
export function ScanPreview() {
  return (
    <figure
      inert
      aria-label="점검 결과 화면 예시: my-shop 리포의 보안 점검 #14, 남은 문제 4개"
      className="bg-muted text-foreground min-h-full select-none"
    >
      <PreviewHeader />
      <div className="flex items-stretch">
        <PreviewMenu />
        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 pt-7 pb-10 sm:px-8">
          <PreviewTitle />
          <ScanSummary />
          <div className="flex flex-wrap items-start gap-5">
            <FindingsTable />
            <FindingDetail />
          </div>
        </div>
      </div>
    </figure>
  );
}
