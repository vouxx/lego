import Link from "next/link";
import type { GuardProjectRow } from "../schemas";
import { PrGuardToggle } from "./PrGuardToggle";

type Props = { projects: GuardProjectRow[] };

/** PR 가드 메뉴: 프로젝트마다 켜기/끄기 */
export function GuardProjectList({ projects }: Props) {
  if (projects.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        연결한 프로젝트가 없습니다.{" "}
        <Link href="/projects/new" className="underline">
          리포를 연결
        </Link>
        하면 PR 가드를 켤 수 있습니다.
      </p>
    );
  return (
    <ul className="divide-y rounded-lg border">
      {projects.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <Link
            href={`/projects/${p.id}`}
            className="min-w-0 flex-1 font-mono text-sm font-medium break-all hover:underline"
          >
            {p.repoFullName}
          </Link>
          {p.available ? (
            <>
              <span className="text-muted-foreground text-xs">
                {p.enabled ? "켜짐 · PR 마다 자동 점검" : "꺼짐"}
              </span>
              <PrGuardToggle projectId={p.id} enabled={p.enabled} />
            </>
          ) : (
            <span className="text-muted-foreground text-xs">
              주소로 등록한 공개 리포라 쓸 수 없음(GitHub App 연결 필요)
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
