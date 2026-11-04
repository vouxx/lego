import { SEVERITIES, type LiveCheckView } from "../schemas";
import { LiveResultCard } from "./LiveResultCard";

type Props = { check: LiveCheckView; repoFullName: string };

const order = (s: (typeof SEVERITIES)[number]) => SEVERITIES.indexOf(s);

/** 가장 최근 점검 결과 */
export function LiveCheckReport({ check, repoFullName }: Props) {
  if (check.status === "running")
    return (
      <p className="text-sm">점검하는 중입니다. 잠시 뒤 새로고침해 주세요.</p>
    );
  if (check.status === "failed")
    return (
      <p role="alert" className="text-destructive text-sm">
        점검하지 못했습니다. {check.error}
      </p>
    );
  const results = [...check.results].sort(
    (a, b) => order(a.severity) - order(b.severity),
  );
  const added = results.filter((r) => r.isNew).length;
  const { summary } = check;
  return (
    <section
      aria-labelledby="live-result-title"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="live-result-title" className="text-lg font-semibold">
          {results.length === 0
            ? "밖에서 보이는 문제를 찾지 못했습니다"
            : `문제 ${results.length}개`}
          {added > 0 ? ` · 새로 생김 ${added}개` : ""}
        </h2>
        <p className="text-muted-foreground text-xs">
          {new Date(check.createdAt).toLocaleString("ko-KR")} ·{" "}
          {check.trigger === "daily" ? "자동(하루 한 번)" : "직접 점검"} · 요청{" "}
          {summary.requests}개 · JS {summary.scripts}개 · 테이블{" "}
          {summary.tables}개 · 버킷 {summary.buckets}개
          {summary.supabase === "not_found" ? " · Supabase 설정 못 찾음" : ""}
        </p>
      </div>
      {summary.notes.length > 0 ? (
        <ul className="text-muted-foreground list-disc pl-5 text-sm">
          {summary.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      <ul className="flex flex-col gap-3">
        {results.map((r) => (
          <li key={`${r.id}-${r.target}`}>
            <LiveResultCard
              result={r}
              repoFullName={repoFullName}
              commitSha={summary.commitSha}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
