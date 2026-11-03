import { Suspense } from "react";
import { IdeaForm } from "@/features/specs/components/IdeaForm";
import { getProjectOptions } from "@/features/specs/services/specs";

type Props = PageProps<"/specs/new">;

export default function NewSpecPage({ searchParams }: Props) {
  return (
    <main className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">아이디어를 스펙으로</h1>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Form searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Form({ searchParams }: Pick<Props, "searchParams">) {
  const [{ projectId }, projects] = await Promise.all([
    searchParams,
    getProjectOptions(),
  ]);
  const selected = projects.find((p) => p.id === projectId)?.id ?? null;
  return <IdeaForm projects={projects} defaultProjectId={selected} />;
}
