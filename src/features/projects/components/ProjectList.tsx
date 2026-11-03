import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { TerminalWindow } from "@/shared/ui/terminal-window";
import type { ProjectSummary } from "../schemas";
import { StackTags } from "./StackTags";

type Props = { projects: ProjectSummary[] };

export function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <TerminalWindow title="시작하기">
        <div className="flex flex-col items-start gap-3 py-2 font-sans">
          <p className="text-terminal-muted font-mono">
            $ lego connect &lt;내 리포&gt;
          </p>
          <p className="text-base font-semibold">첫 리포를 연결해 보세요</p>
          <p className="text-terminal-muted text-sm">
            공개 리포는 주소만, 비공개 리포는 읽기 허용 한 번이면 됩니다.
            연결하면 보안 점검, 규칙 파일, 스펙을 쓸 수 있습니다.
          </p>
          <Link
            href="/projects/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            리포 연결하기
          </Link>
        </div>
      </TerminalWindow>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
          >
            <span className="min-w-0 flex-1 font-mono text-sm font-medium break-all">
              {project.repoFullName}
            </span>
            {project.stack ? <StackTags tags={project.stack.tags} /> : null}
            <span className="text-muted-foreground font-mono text-xs">
              {project.defaultBranch}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
