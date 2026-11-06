import type { getUsageOverview } from "../services/usage";

const usd = (value: number) => `$${value.toFixed(2)}`;

export function UsageOverview({
  overview,
}: {
  overview: Awaited<ReturnType<typeof getUsageOverview>>;
}) {
  const { steps, costs, windowDays } = overview;
  const top = steps[0]?.users ?? 0;
  return (
    <>
      <section className="flex flex-col gap-3" aria-labelledby="usage-funnel">
        <h2 id="usage-funnel" className="text-lg font-semibold">
          사용자 흐름
        </h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="py-1 font-medium">단계</th>
              <th className="py-1 text-right font-medium">사용자</th>
              <th className="py-1 text-right font-medium">가입 대비</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.label} className="border-t">
                <td className="py-1.5">{step.label}</td>
                <td className="py-1.5 text-right tabular-nums">{step.users}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {top > 0 ? `${Math.round((step.users / top) * 100)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="usage-cost">
        <h2 id="usage-cost" className="text-lg font-semibold">
          최근 {windowDays}일 AI 비용 {usd(costs.totalUsd)}
        </h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-left">
            <tr>
              <th className="py-1 font-medium">사용자</th>
              <th className="py-1 text-right font-medium">호출</th>
              <th className="py-1 text-right font-medium">비용</th>
            </tr>
          </thead>
          <tbody>
            {costs.users.slice(0, 20).map((user) => (
              <tr key={user.login} className="border-t">
                <td className="py-1.5">{user.login}</td>
                <td className="py-1.5 text-right tabular-nums">{user.calls}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {usd(user.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="text-muted-foreground flex flex-wrap gap-x-4 text-sm">
          {costs.purposes.map((p) => (
            <li key={p.purpose}>
              {p.purpose} {usd(p.costUsd)}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
