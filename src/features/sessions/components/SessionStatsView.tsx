import type { SessionStats } from "../schemas";

type Props = { stats: SessionStats };

export function SessionStatsView({ stats }: Props) {
  const items = [
    ["턴", stats.turns.toLocaleString()],
    ["도구 호출", stats.toolCalls.toLocaleString()],
    ["토큰(추정)", stats.approxTokens.toLocaleString()],
    [
      "걸린 시간",
      stats.durationMinutes !== null ? `${stats.durationMinutes}분` : "-",
    ],
    ["가린 값", stats.maskedCount.toLocaleString()],
  ];
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-md border p-2">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {stats.repeatedEdits.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          여러 번 고친 파일:{" "}
          {stats.repeatedEdits.map((e) => `${e.file}(${e.count})`).join(", ")}
        </p>
      ) : null}
      {stats.repeatedErrors.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          반복된 오류:{" "}
          {stats.repeatedErrors.map((e) => `${e.error}(${e.count})`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
