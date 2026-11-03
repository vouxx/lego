import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExplanationScreen } from "@/features/learn/components/ExplanationScreen";
import { getExplanationView } from "@/features/learn/services/views";

type Props = PageProps<"/learn/[explanationId]">;

export default function ExplanationPage({ params }: Props) {
  return (
    <main className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/learn"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← 학습
      </Link>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Explanation params={params} />
      </Suspense>
    </main>
  );
}

async function Explanation({ params }: Pick<Props, "params">) {
  const { explanationId } = await params;
  const view = await getExplanationView(explanationId);
  if (!view.ok) notFound();
  return <ExplanationScreen view={view.data} />;
}
