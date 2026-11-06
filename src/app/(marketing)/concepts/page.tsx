import type { Metadata } from "next";
import { ConceptIndex } from "@/features/concepts/components/ConceptIndex";
import { getConceptList } from "@/features/concepts/services/views";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "개념 사전 · Lego",
  description:
    "AI 로 앱을 만들 때 꼭 알아야 할 보안·웹 개념을 쉽게 정리했습니다.",
};

export default async function ConceptsPage() {
  const concepts = await getConceptList();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="개념 사전"
        description="레고 보안 점검 규칙과 연결된 개념들입니다. AI 가 만든 코드를 읽을 때 자주 만납니다."
      />
      <ConceptIndex concepts={concepts} />
    </main>
  );
}
