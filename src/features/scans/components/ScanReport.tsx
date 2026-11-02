import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import type { Result } from "@/shared/lib/result";
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
};

export function ScanReport({ scan, findings, diff }: Props) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${scan.projectId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← 프로젝트
        </Link>
        <h1 className="text-2xl font-semibold">보안 점검 결과</h1>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(scan.createdAt)}
          {scan.commitSha ? ` · 커밋 ${scan.commitSha.slice(0, 7)}` : ""}
        </p>
      </div>
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
