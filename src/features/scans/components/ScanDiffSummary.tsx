import Link from "next/link";
import type { ScanDiffView } from "../schemas";

type Props = { projectId: string; diff: ScanDiffView };

export function ScanDiffSummary({ projectId, diff }: Props) {
  return (
    <p className="text-sm">
      <Link
        href={`/projects/${projectId}/scans/${diff.previousScanId}`}
        className="text-muted-foreground hover:underline"
      >
        직전 점검
      </Link>{" "}
      대비: 새로 생김{" "}
      <span className="font-medium">{diff.newFindingIds.length}</span> · 해결됨{" "}
      <span className="font-medium">{diff.fixed.length}</span> · 그대로{" "}
      <span className="font-medium">{diff.unchangedCount}</span>
    </p>
  );
}
