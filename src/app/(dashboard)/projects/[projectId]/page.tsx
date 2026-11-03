import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { getProject } from "@/features/projects/services/projects";
import { ScanHistorySection } from "@/features/scans/components/ScanHistorySection";
import { StartScanButton } from "@/features/scans/components/StartScanButton";
import { getProjectScans } from "@/features/scans/services/scans";

type Props = PageProps<"/projects/[projectId]">;

export default function ProjectPage({ params }: Props) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({ params }: Pick<Props, "params">) {
  const { projectId } = await params;
  const [project, scans] = await Promise.all([
    getProject(projectId),
    getProjectScans(projectId),
  ]);
  if (!project.ok) notFound();

  return (
    <>
      <ProjectHeader
        projectId={projectId}
        repoFullName={project.data.repoFullName}
        stack={project.data.stack}
        scanAction={<StartScanButton projectId={projectId} />}
      />
      <ScanHistorySection projectId={projectId} scans={scans} />
    </>
  );
}
