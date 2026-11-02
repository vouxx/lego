import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StackTags } from "@/features/projects/components/StackTags";
import { getProject } from "@/features/projects/services/projects";
import { ScanHistory } from "@/features/scans/components/ScanHistory";
import { StartScanButton } from "@/features/scans/components/StartScanButton";
import { getProjectScans } from "@/features/scans/services/scans";

export default function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  return (
    <main className="flex flex-col gap-6">
      <Link
        href="/projects"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← 프로젝트
      </Link>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({
  params,
}: Pick<PageProps<"/projects/[projectId]">, "params">) {
  const { projectId } = await params;
  const [project, scans] = await Promise.all([
    getProject(projectId),
    getProjectScans(projectId),
  ]);
  if (!project.ok) notFound();

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold break-all">
            {project.data.repoFullName}
          </h1>
          {project.data.stack ? (
            <StackTags tags={project.data.stack.tags} />
          ) : null}
        </div>
        <StartScanButton projectId={projectId} />
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">점검 기록</h2>
        {scans.ok ? (
          <ScanHistory projectId={projectId} scans={scans.data} />
        ) : (
          <p role="alert" className="text-destructive text-sm">
            {scans.error.message}
          </p>
        )}
      </section>
    </>
  );
}
