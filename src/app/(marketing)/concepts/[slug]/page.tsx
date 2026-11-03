import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConceptArticle } from "@/features/learn/components/ConceptArticle";
import {
  getConceptList,
  getConceptPage,
} from "@/features/learn/services/views";

type Props = PageProps<"/concepts/[slug]">;

export async function generateStaticParams() {
  return (await getConceptList()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  "use cache";
  const concept = await getConceptPage((await params).slug);
  return concept
    ? {
        title: `${concept.title} · 레고 개념 사전`,
        description: concept.summary,
      }
    : {};
}

export default function ConceptPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8 *:max-w-3xl sm:px-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Concept params={params} />
      </Suspense>
    </main>
  );
}

async function Concept({ params }: Pick<Props, "params">) {
  const concept = await getConceptPage((await params).slug);
  if (!concept) notFound();
  return <ConceptArticle concept={concept} />;
}
