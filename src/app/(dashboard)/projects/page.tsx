import Link from "next/link";
import { Suspense } from "react";
import { ProjectList } from "@/features/projects/components/ProjectList";
import { getMyProjects } from "@/features/projects/services/projects";
import { buttonVariants } from "@/shared/ui/button";

export default function ProjectsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">프로젝트</h1>
        <Link
          href="/projects/new"
          className={buttonVariants({ variant: "outline" })}
        >
          리포 연결
        </Link>
      </div>
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
