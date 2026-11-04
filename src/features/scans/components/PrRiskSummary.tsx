import type { PrFindingRef, PrRiskArea, PrScope } from "../schemas";

type Props = {
  risk: PrRiskArea[];
  scope: PrScope | null;
  resolved: PrFindingRef[];
};

/** PR 리뷰 화면의 위험 영역·스펙 작업 범위·해결된 문제 */
export function PrRiskSummary({ risk, scope, resolved }: Props) {
  if (risk.length === 0 && !scope && resolved.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {risk.length > 0 ? (
        <section
          aria-labelledby="pr-risk"
          className="flex flex-col gap-2 rounded-lg border p-4"
        >
          <h2 id="pr-risk" className="font-semibold">
            이 PR 이 건드린 위험 영역
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {risk.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{a.label}</span>
                {a.files.length > 0 ? (
                  <span className="text-muted-foreground block font-mono text-xs break-all">
                    {a.files.slice(0, 4).join(", ")}
                    {a.files.length > 4 ? ` 외 ${a.files.length - 4}개` : ""}
                  </span>
                ) : null}
                {a.note ? (
                  <span className="text-muted-foreground block text-xs">
                    {a.note}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {scope ? (
        <section
          aria-labelledby="pr-scope"
          className="flex flex-col gap-2 rounded-lg border p-4"
        >
          <h2 id="pr-scope" className="font-semibold">
            스펙 작업 범위
          </h2>
          <p className="text-muted-foreground text-xs">
            {scope.tasks.map((t) => `${t.key} ${t.title}`).join(" · ")}
          </p>
          {scope.outside.length === 0 ? (
            <p className="text-sm">
              바뀐 파일이 모두 작업 범위 안으로 보입니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {scope.outside.map((o) => (
                <li key={o.path}>
                  <code className="font-mono text-xs break-all">{o.path}</code>
                  <span className="text-muted-foreground block text-xs">
                    {o.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      {resolved.length > 0 ? (
        <section
          aria-labelledby="pr-resolved"
          className="flex flex-col gap-2 rounded-lg border p-4"
        >
          <h2 id="pr-resolved" className="font-semibold">
            이 커밋에서 해결됨 {resolved.length}개
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {resolved.map((r) => (
              <li
                key={`${r.ruleId}-${r.filePath}-${r.line}`}
                className="text-muted-foreground line-through"
              >
                <code className="font-mono text-xs">{r.ruleId}</code>{" "}
                {r.ruleTitle} — {r.filePath}:{r.line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
