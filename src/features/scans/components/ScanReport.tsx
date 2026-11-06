import { formatDateTime } from "@/shared/lib/format";
import type { Result } from "@/shared/lib/result";
import { PageHeader } from "@/shared/ui/page-header";
import type { FindingView, ScanDiffView, ScanView } from "../schemas";
import { FindingList } from "./FindingList";
import { FixedFindingList } from "./FixedFindingList";
import { ScanDiffSummary } from "./ScanDiffSummary";
import { ScanProgress } from "./ScanProgress";
import { SeveritySummary } from "./SeveritySummary";

type Props = {
  scan: ScanView;
  findings: Result<FindingView[]> | null;
  diff: ScanDiffView | null;
  /** 초대받은 멤버: 상태를 바꾸지 못한다 */
  readOnly?: boolean;
};

export function ScanReport({ scan, findings, diff, readOnly = false }: Props) {
  return (
    <>
      <PageHeader
        trail={[
          { href: "/projects", label: "프로젝트" },
          { href: `/projects/${scan.projectId}`, label: "점검 기록" },
          { label: "결과" },
        ]}
        title="보안 점검 결과"
        description={
          <span className="font-mono text-xs">
            {formatDateTime(scan.createdAt)}
            {scan.commitSha ? ` · 커밋 ${scan.commitSha.slice(0, 7)}` : ""}
          </span>
        }
      />
      <ScanProgress
        scanId={scan.id}
        initial={{
          status: scan.status,
          progress: scan.progress,
          error: scan.error,
        }}
      />
      {scan.summary ? <SeveritySummary summary={scan.summary} /> : null}
      {diff ? <ScanDiffSummary projectId={scan.projectId} diff={diff} /> : null}
      {findings?.ok ? (
        <FindingList
          findings={findings.data}
          newFindingIds={diff?.newFindingIds}
          readOnly={readOnly}
        />
      ) : null}
      {findings && !findings.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {findings.error.message}
        </p>
      ) : null}
      {diff ? <FixedFindingList fixed={diff.fixed} /> : null}
    </>
  );
}
