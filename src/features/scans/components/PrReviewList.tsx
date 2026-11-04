import Link from "next/link";
import { SEVERITIES, type PrReviewRow } from "../schemas";
import { SeverityBadge } from "./SeverityBadge";

const STATUS_LABEL: Record<PrReviewRow["status"], string> = {
  queued: "대기",
  running: "점검 중",
  done: "완료",
  failed: "실패",
};

type Props = { projectId: string; reviews: PrReviewRow[] };

export function PrReviewList({ projectId, reviews }: Props) {
  if (reviews.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        아직 점검한 PR 이 없습니다. PR 을 열거나 커밋을 올리면 자동으로
        점검합니다.
      </p>
    );
  return (
    <ul className="divide-y rounded-lg border">
      {reviews.map((r) => (
        <li key={r.id}>
          <Link
            href={`/projects/${projectId}/reviews/${r.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span className="text-muted-foreground font-mono text-xs">
              #{r.prNumber}
            </span>
            <span className="min-w-0 flex-1 truncate">{r.prTitle}</span>
            <span className="flex items-center gap-1">
              {SEVERITIES.filter((s) => (r.summary.counts[s] ?? 0) > 0).map(
                (s) => (
                  <span key={s} className="flex items-center gap-1">
                    <SeverityBadge severity={s} />
                    <span className="font-mono text-xs">
                      {r.summary.counts[s]}
                    </span>
                  </span>
                ),
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              {STATUS_LABEL[r.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
