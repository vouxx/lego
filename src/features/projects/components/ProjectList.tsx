import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import type { ProjectSummary } from "../schemas";
import { StackTags } from "./StackTags";

type Props = { projects: ProjectSummary[] };

export function ProjectList({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>아직 프로젝트가 없습니다</CardTitle>
          <CardDescription>
            GitHub 리포를 연결하면 보안 점검을 시작할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <div className="px-6">
          <Link href="/projects/new" className={buttonVariants()}>
            리포 연결하기
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Card>
            <CardHeader>
              <CardTitle>{project.repoFullName}</CardTitle>
              <CardDescription>
                기본 브랜치 {project.defaultBranch}
              </CardDescription>
            </CardHeader>
            {project.stack ? (
              <div className="px-6">
                <StackTags tags={project.stack.tags} />
              </div>
            ) : null}
          </Card>
        </li>
      ))}
    </ul>
  );
}
