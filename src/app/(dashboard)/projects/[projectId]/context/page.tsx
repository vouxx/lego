import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContextScreen } from "@/features/context/components/ContextScreen";
import { parseTarget } from "@/features/context/schemas";
import { getContextView } from "@/features/context/services/view";

type Props = PageProps<"/projects/[projectId]/context">;

export default function ContextPage({ params, searchParams }: Props) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Context params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Context({ params, searchParams }: Props) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const view = await getContextView(projectId, parseTarget(query.target));
  if (!view.ok) notFound();

  return (
    <>
      <ContextScreen view={view.data} />
    </>
  );
}
