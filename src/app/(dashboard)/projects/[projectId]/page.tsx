import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeaveProjectButton } from "@/features/members/components/LeaveProjectButton";
import { MembersSection } from "@/features/members/components/MembersSection";
import { getMembersState } from "@/features/members/services/members";
import { SlackSection } from "@/features/notifications/components/SlackSection";
import { getSlackState } from "@/features/notifications/services/settings";
import { ProjectHeader } from "@/features/projects/components/ProjectHeader";
import { getProject } from "@/features/projects/services/projects";
import { PrGuardSection } from "@/features/scans/components/PrGuardSection";
import { ScanHistorySection } from "@/features/scans/components/ScanHistorySection";
import { ScanTrendSection } from "@/features/scans/components/ScanTrendSection";
import { StartScanButton } from "@/features/scans/components/StartScanButton";
import {
  getPrGuardState,
  getProjectPrReviews,
} from "@/features/scans/services/pr-reviews";
import { getProjectScans } from "@/features/scans/services/scans";
import { getProjectTrend } from "@/features/scans/services/trend-data";

type Props = PageProps<"/projects/[projectId]">;

export default function ProjectPage({ params, searchParams }: Props) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Project params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Project({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const { projectId } = await params;
  const { slack } = await searchParams;
  const [project, scans, guard, reviews, trend, slackState] = await Promise.all(
    [
      getProject(projectId),
      getProjectScans(projectId),
      getPrGuardState(projectId),
      getProjectPrReviews(projectId),
      getProjectTrend(projectId),
      getSlackState(projectId),
    ],
  );
  if (!project.ok) notFound();

  const viewer = project.data.role === "viewer";
  const members = viewer ? null : await getMembersState(projectId);

  return (
    <>
      <ProjectHeader
        projectId={projectId}
        repoFullName={project.data.repoFullName}
        stack={project.data.stack}
        scanAction={<StartScanButton projectId={projectId} />}
        viewerAction={
          viewer ? (
            <LeaveProjectButton
              projectId={projectId}
              repoFullName={project.data.repoFullName}
            />
          ) : undefined
        }
      />
      <ScanTrendSection trend={trend} />
      <ScanHistorySection projectId={projectId} scans={scans} />
      <PrGuardSection
        projectId={projectId}
        {...guard}
        reviews={reviews}
        readOnly={viewer}
      />
      {members ? (
        <>
          <SlackSection
            projectId={projectId}
            {...slackState}
            status={typeof slack === "string" ? slack : undefined}
          />
          <MembersSection projectId={projectId} {...members} />
        </>
      ) : null}
    </>
  );
}
