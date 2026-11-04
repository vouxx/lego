import Link from "next/link";
import { SEVERITIES, type GuardReviewRow } from "../schemas";
import { SeverityBadge } from "./SeverityBadge";

const STATUS_LABEL: Record<GuardReviewRow["status"], string> = {
  queued: "대기",
  running: "점검 중",
  done: "완료",
  failed: "실패",
};

const CONCLUSION: Record<string, string> = {
  failure: "체크 실패",
  neutral: "확인 필요",
  success: "통과",
};

type Props = { reviews: GuardReviewRow[] };

/** PR 가드 메뉴: 모든 프로젝트의 최근 PR 점검 */
export function GuardReviewList({ reviews }: Props) {
  if (reviews.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        아직 점검한 PR 이 없습니다. PR 가드를 켠 리포에 PR 을 열거나 커밋을
        올리면 여기에 쌓입니다.
      </p>
    );
  return (
    <ul className="divide-y rounded-lg border">
      {reviews.map((r) => (
        <li key={r.id}>
          <Link
            href={`/projects/${r.projectId}/reviews/${r.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
          >
            <span className="text-muted-foreground w-full font-mono text-xs sm:w-56 sm:truncate">
              {r.repoFullName} #{r.prNumber}
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
              {r.status === "done" && r.summary.conclusion
                ? CONCLUSION[r.summary.conclusion]
                : STATUS_LABEL[r.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
