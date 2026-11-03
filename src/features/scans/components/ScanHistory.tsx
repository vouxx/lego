import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import type { ScanView } from "../schemas";
import { ScanStatusBadge } from "./ScanStatusBadge";

type Props = { projectId: string; scans: ScanView[] };

export function ScanHistory({ projectId, scans }: Props) {
  if (scans.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        아직 점검한 기록이 없습니다. 위의 보안 점검을 눌러 시작하세요.
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
            <span className="flex items-center gap-4 text-sm">
              <span className="w-16">
                <ScanStatusBadge status={scan.status} />
              </span>
              <span className="font-mono text-xs">
                {formatDateTime(scan.createdAt)}
              </span>
              {scan.commitSha ? (
                <code className="text-muted-foreground text-xs">
                  {scan.commitSha.slice(0, 7)}
                </code>
              ) : null}
            </span>
            <span className="text-muted-foreground font-mono text-xs">
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
