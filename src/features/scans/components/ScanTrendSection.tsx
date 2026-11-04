import { StatGrid } from "@/shared/ui/stat-grid";
import type { ProjectTrend } from "../services/trend";
import { TrendChart } from "./TrendChart";

type Props = { trend: ProjectTrend };

/** 프로젝트 화면: 점검을 거듭하며 나아지고 있는지 */
export function ScanTrendSection({ trend }: Props) {
  const { points } = trend;
  if (points.length < 2) return null;
  const last = points[points.length - 1]!;
  const prev = points[points.length - 2]!;
  const delta = last.open - prev.open;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="trend-title">
      <div className="flex flex-col gap-1">
        <h2 id="trend-title" className="text-lg font-semibold">
          보안 추이
        </h2>
        <p className="text-muted-foreground text-sm">
          최근 점검 {points.length}번의 남은 문제 수. AI 가 오탐으로 본 것과
          무시한 것은 세지 않습니다.
        </p>
      </div>
      <StatGrid
        items={[
          {
            label: "지금 남은 문제",
            value: last.open,
            note:
              delta === 0
                ? "지난 점검과 같음"
                : `지난 점검보다 ${Math.abs(delta)}개 ${delta < 0 ? "줄었음" : "늘었음"}`,
          },
          {
            label: "critical·high",
            value: last.serious,
          },
          {
            label: "해결한 문제",
            value: trend.fixedTotal,
            note: `최근 점검 ${points.length}번 동안`,
          },
          {
            label: "해결까지 걸린 시간",
            value:
              trend.medianDaysToFix === null
                ? "—"
                : trend.medianDaysToFix < 1
                  ? "1일 안"
                  : `${Math.round(trend.medianDaysToFix)}일`,
            note: "중앙값",
          },
        ]}
      />
      <TrendChart points={points} />
      <details className="text-sm">
        <summary className="cursor-pointer">표로 보기</summary>
        <table className="mt-2 w-full text-xs">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th scope="col" className="py-1 font-medium">
                점검
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                남은 문제
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                critical·high
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                새로 생김
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                해결
              </th>
            </tr>
          </thead>
          <tbody className="divide-y tabular-nums">
            {[...points].reverse().map((p) => (
              <tr key={p.scanId}>
                <td className="py-1">
                  {new Date(p.at).toLocaleString("ko-KR")}
                </td>
                <td className="py-1 text-right">{p.open}</td>
                <td className="py-1 text-right">{p.serious}</td>
                <td className="py-1 text-right">{p.added}</td>
                <td className="py-1 text-right">{p.fixed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
