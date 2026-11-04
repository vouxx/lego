import { SeverityMark } from "@/shared/ui/severity";
import { SEVERITIES, type LiveCheckView } from "../schemas";

type Props = { checks: LiveCheckView[] };

/** 최근 점검 기록: 날짜와 심각도별 개수 */
export function LiveHistory({ checks }: Props) {
  if (checks.length < 2) return null;
  return (
    <section
      aria-labelledby="live-history-title"
      className="flex flex-col gap-2"
    >
      <h2 id="live-history-title" className="font-semibold">
        점검 기록
      </h2>
      <ul className="divide-y rounded-lg border text-sm">
        {checks.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 px-4 py-2"
          >
            <span className="text-muted-foreground font-mono text-xs">
              {new Date(c.createdAt).toLocaleString("ko-KR")}
            </span>
            <span className="text-muted-foreground text-xs">
              {c.trigger === "daily" ? "자동" : "직접"}
            </span>
            <span className="flex flex-1 flex-wrap items-center gap-2">
              {c.status !== "done"
                ? c.status === "failed"
                  ? "실패"
                  : "점검 중"
                : SEVERITIES.map((s) => {
                    const n = c.results.filter((r) => r.severity === s).length;
                    return n > 0 ? (
                      <span
                        key={s}
                        className="flex items-center gap-1 font-mono text-xs"
                      >
                        <SeverityMark severity={s} /> {n}
                      </span>
                    ) : null;
                  })}
              {c.status === "done" && c.results.length === 0
                ? "문제 없음"
                : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
