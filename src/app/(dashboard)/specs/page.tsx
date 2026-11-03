import Link from "next/link";
import { Suspense } from "react";
import { SpecList } from "@/features/specs/components/SpecList";
import { getMySpecs } from "@/features/specs/services/specs";
import { buttonVariants } from "@/shared/ui/button";

export default function SpecsPage() {
  return (
    <main className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">스펙</h1>
        <Link href="/specs/new" className={buttonVariants()}>
          새 아이디어
        </Link>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Specs />
      </Suspense>
    </main>
  );
}

async function Specs() {
  const specs = await getMySpecs();
  if (!specs.ok) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {specs.error.message}
      </p>
    );
  }
  return <SpecList specs={specs.data} />;
}
