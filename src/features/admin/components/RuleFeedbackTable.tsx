import type { RuleFeedbackRow } from "../schemas";

type Props = { rules: RuleFeedbackRow[] };

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** 규칙별 오탐 피드백 표: 시끄러운(오탐·무시가 많은) 규칙부터 */
export function RuleFeedbackTable({ rules }: Props) {
  if (rules.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        아직 모인 발견이 없습니다.
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">규칙별 오탐 피드백</caption>
        <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              규칙
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              발견
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              AI 오탐
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              AI 불확실
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              사용자 무시
            </th>
            <th scope="col" className="w-40 px-3 py-2 font-medium">
              잡음 비율
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rules.map((r) => (
            <tr key={r.ruleId}>
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {r.ruleId}
                </span>
                {r.ruleTitle}
                <span className="text-muted-foreground ml-2 text-xs">
                  스캔 {r.bySource.scan} · PR {r.bySource.pr}
                </span>
              </th>
              <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.aiFalsePositive}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.aiUncertain}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.userIgnored}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
                    aria-hidden="true"
                  >
                    <div
                      className={
                        r.noiseRate >= 0.5
                          ? "bg-destructive h-full"
                          : "bg-foreground/60 h-full"
                      }
                      style={{ width: pct(r.noiseRate) }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs tabular-nums">
                    {pct(r.noiseRate)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
