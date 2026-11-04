import type { IgnoreReasonRow } from "../schemas";

type Props = { reasons: IgnoreReasonRow[] };

/** PR 가드에서 /lego ignore 로 남긴 최근 이유 */
export function IgnoreReasonList({ reasons }: Props) {
  if (reasons.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        아직 /lego ignore 로 무시한 항목이 없습니다.
      </p>
    );
  return (
    <ul className="divide-y rounded-lg border">
      {reasons.map((r) => (
        <li
          key={`${r.repo}-${r.prNumber}-${r.ruleId}-${r.filePath}`}
          className="flex flex-col gap-1 px-4 py-3"
        >
          <p className="text-sm">“{r.reason}”</p>
          <p className="text-muted-foreground font-mono text-xs break-all">
            {r.ruleId} {r.ruleTitle} · {r.repo}
            {r.prNumber ? ` #${r.prNumber}` : ""} · {r.filePath}
            {r.by ? ` · @${r.by}` : ""} ·{" "}
            {new Date(r.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
