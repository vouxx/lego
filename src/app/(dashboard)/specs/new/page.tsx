import { Suspense } from "react";
import { IdeaForm } from "@/features/specs/components/IdeaForm";
import { getProjectOptions } from "@/features/specs/services/specs";
import { PageHeader } from "@/shared/ui/page-header";

type Props = PageProps<"/specs/new">;

export default function NewSpecPage({ searchParams }: Props) {
  return (
    <main className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        trail={[{ href: "/specs", label: "스펙" }, { label: "새 아이디어" }]}
        title="아이디어를 스펙으로"
        description="확인 질문 몇 개에 답하면 PRD, 설계, 작업 10~20개를 만듭니다."
      />
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
