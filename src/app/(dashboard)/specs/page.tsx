import Link from "next/link";
import { Suspense } from "react";
import { SpecList } from "@/features/specs/components/SpecList";
import { getMySpecs } from "@/features/specs/services/specs";
import { buttonVariants } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

export default function SpecsPage() {
  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="스펙"
        description="한 줄 아이디어를 PRD, 설계, 순서가 있는 작업으로 나눕니다."
        actions={
          <Link href="/specs/new" className={buttonVariants()}>
            새 아이디어
          </Link>
        }
      />
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
