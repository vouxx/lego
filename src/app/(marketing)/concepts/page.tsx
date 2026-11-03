import type { Metadata } from "next";
import { ConceptIndex } from "@/features/learn/components/ConceptIndex";
import { getConceptList } from "@/features/learn/services/views";

export const metadata: Metadata = {
  title: "개념 사전 · 레고",
  description:
    "AI 로 앱을 만들 때 꼭 알아야 할 보안·웹 개념을 쉽게 정리했습니다.",
};

export default async function ConceptsPage() {
  const concepts = await getConceptList();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">개념 사전</h1>
        <p className="text-muted-foreground">
          레고 보안 점검 규칙과 연결된 개념들입니다. AI 가 만든 코드를 읽을 때
          자주 만납니다.
        </p>
      </div>
      <ConceptIndex concepts={concepts} />
    </main>
  );
}
