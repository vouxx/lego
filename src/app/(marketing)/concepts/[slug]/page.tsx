import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const concept = await getConceptPage((await params).slug);
  return concept
    ? {
        title: `${concept.title} · 레고 개념 사전`,
        description: concept.summary,
      }
    : {};
}

export default async function ConceptPage({ params }: Props) {
  "use cache";
  const concept = await getConceptPage((await params).slug);
  if (!concept) notFound();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <ConceptArticle concept={concept} />
    </main>
  );
}
