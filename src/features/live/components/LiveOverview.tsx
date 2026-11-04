import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { SeverityMark } from "@/shared/ui/severity";
import { SEVERITIES, type LiveOverviewRow } from "../schemas";

type Props = { rows: LiveOverviewRow[] };

function Status({ row }: { row: LiveOverviewRow }) {
  if (!row.siteUrl)
    return (
      <span className="text-muted-foreground text-xs">배포 주소 없음</span>
    );
  if (!row.verified)
    return (
      <span className="text-muted-foreground text-xs">소유 확인 대기</span>
    );
  const check = row.lastCheck;
  if (!check)
    return (
      <span className="text-muted-foreground text-xs">아직 점검 안 함</span>
    );
  if (check.status !== "done")
    return (
      <span className="text-muted-foreground text-xs">
        {check.status === "failed" ? "점검 실패" : "점검 중"}
      </span>
    );
  const total = Object.values(check.counts).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <span className="flex flex-wrap items-center gap-2">
      {total === 0 ? (
        <span className="text-xs">문제 없음</span>
      ) : (
        SEVERITIES.filter((s) => (check.counts[s] ?? 0) > 0).map((s) => (
          <span key={s} className="flex items-center gap-1 font-mono text-xs">
            <SeverityMark severity={s} /> {check.counts[s]}
          </span>
        ))
      )}
      {check.newCount > 0 ? (
        <Badge variant="outline">새로 생김 {check.newCount}</Badge>
      ) : null}
      <span className="text-muted-foreground text-xs">
        {new Date(check.createdAt).toLocaleString("ko-KR")}
      </span>
    </span>
  );
}

/** 운영 점검 메뉴: 프로젝트마다 배포 주소·확인 상태·최근 결과 */
export function LiveOverview({ rows }: Props) {
  if (rows.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        연결한 프로젝트가 없습니다.{" "}
        <Link href="/projects/new" className="underline">
          리포를 연결
        </Link>
        한 뒤 배포 주소를 등록해 주세요.
      </p>
    );
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row) => (
        <li key={row.projectId}>
          <Link
            href={`/projects/${row.projectId}/live`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-mono text-sm font-medium break-all">
                {row.repoFullName}
              </span>
              <span className="text-muted-foreground font-mono text-xs break-all">
                {row.siteUrl ?? "—"}
              </span>
            </span>
            <Status row={row} />
            <span className="text-sm font-medium">
              {row.siteUrl ? "열기 →" : "주소 등록 →"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
