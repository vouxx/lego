import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import type { ScanView } from "../schemas";
import { ScanStatusBadge } from "./ScanStatusBadge";

type Props = { projectId: string; scans: ScanView[] };

export function ScanHistory({ projectId, scans }: Props) {
  if (scans.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        아직 점검한 기록이 없습니다.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {scans.map((scan) => (
        <li key={scan.id}>
          <Link
            href={`/projects/${projectId}/scans/${scan.id}`}
            className="hover:bg-muted/50 flex items-center justify-between gap-3 px-4 py-3"
          >
            <span className="flex items-center gap-3 text-sm">
              <ScanStatusBadge status={scan.status} />
              <span>{formatDateTime(scan.createdAt)}</span>
              {scan.commitSha ? (
                <code className="text-muted-foreground text-xs">
                  {scan.commitSha.slice(0, 7)}
                </code>
              ) : null}
            </span>
            <span className="text-muted-foreground text-sm">
              {scan.summary
                ? `문제 ${scan.summary.total}개`
                : scan.status === "failed"
                  ? "실패"
                  : `${scan.progress}%`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
