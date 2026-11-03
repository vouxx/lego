import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SpecScreen } from "@/features/specs/components/SpecScreen";
import { getSpecView } from "@/features/specs/services/specs";

type Props = PageProps<"/specs/[specId]">;

export default function SpecPage({ params }: Props) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Spec params={params} />
      </Suspense>
    </main>
  );
}

async function Spec({ params }: Pick<Props, "params">) {
  await connection();
  const { specId } = await params;
  const spec = await getSpecView(specId);
  if (!spec.ok) notFound();
  return <SpecScreen spec={spec.data} />;
}
