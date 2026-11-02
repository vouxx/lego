import type { FindingView } from "../schemas";
import { FindingCard } from "./FindingCard";

type Props = {
  findings: FindingView[];
  /** 직전 점검에는 없던 항목 id */
  newFindingIds?: string[];
};

export function FindingList({ findings, newFindingIds = [] }: Props) {
  const newIds = new Set(newFindingIds);
  const visible = findings.filter((f) => f.aiVerdict !== "false_positive");
  const falsePositives = findings.filter(
    (f) => f.aiVerdict === "false_positive",
  );

  return (
    <div className="flex flex-col gap-4">
      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
          발견된 보안 문제가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((finding) => (
            <li key={finding.id}>
              <FindingCard finding={finding} isNew={newIds.has(finding.id)} />
            </li>
          ))}
        </ul>
      )}
      {falsePositives.length > 0 ? (
        <details className="rounded-lg border p-4">
          <summary className="text-muted-foreground cursor-pointer text-sm">
            AI가 오탐으로 판단한 항목 {falsePositives.length}개
          </summary>
          <ul className="mt-4 flex flex-col gap-4">
            {falsePositives.map((finding) => (
              <li key={finding.id}>
                <FindingCard finding={finding} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
