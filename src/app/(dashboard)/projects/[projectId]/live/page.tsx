import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LiveScreen } from "@/features/live/components/LiveScreen";
import { getLivePage } from "@/features/live/services/live";

type Props = PageProps<"/projects/[projectId]/live">;

// 점검은 Server Action 안에서 끝까지 돈다(요청 80개 이내, 보통 10~30초).
export const maxDuration = 60;

export default function LivePage({ params }: Props) {
  return (
    <main className="flex max-w-4xl flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Live params={params} />
      </Suspense>
    </main>
  );
}

async function Live({ params }: Pick<Props, "params">) {
  const { projectId } = await params;
  const page = await getLivePage(projectId);
  if (!page) notFound();
  return (
    <LiveScreen
      projectId={projectId}
      repoFullName={page.project.repo_full_name}
      readOnly={page.project.readOnly}
      target={page.target}
      checks={page.checks}
    />
  );
}
