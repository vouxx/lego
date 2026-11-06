import Link from "next/link";
import { Suspense } from "react";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { UsageMeter } from "@/features/projects/components/UsageMeter";
import { getSharedProjects } from "@/features/members/services/members";
import { getMyProjects } from "@/features/projects/services/projects";
import { getMyUsage } from "@/features/projects/services/usage";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();
  const [result, shared, usage] = await Promise.all([
    getMyProjects(),
    getSharedProjects(user),
    getMyUsage(),
  ]);
  if (!result.ok)
    return (
      <p role="alert" className="text-destructive text-sm">
        {result.error.message}
      </p>
    );
  return (
    <>
      <UsageMeter {...usage} />
      <ProjectList projects={result.data} />
      {shared.length > 0 ? (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="shared-projects-title"
        >
          <h2 id="shared-projects-title" className="font-medium">
            초대받은 프로젝트
          </h2>
          <ProjectList projects={shared} />
        </section>
      ) : null}
    </>
  );
}
