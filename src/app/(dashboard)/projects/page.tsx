import Link from "next/link";
import { Suspense } from "react";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getMyProjects } from "@/features/projects/services/projects";
import { buttonVariants } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

export default function ProjectsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="프로젝트"
        description="연결한 GitHub 리포. 리포마다 보안 점검과 규칙 파일을 씁니다."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            리포 연결
          </Link>
        }
      />
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Projects />
      </Suspense>
    </main>
  );
}

async function Projects() {
  const result = await getMyProjects();
  if (!result.ok)
    return (
      <p role="alert" className="text-destructive text-sm">
        {result.error.message}
      </p>
    );
  return <ProjectList projects={result.data} />;
}
