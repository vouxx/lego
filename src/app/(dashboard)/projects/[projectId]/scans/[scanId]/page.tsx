import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScanReport } from "@/features/scans/components/ScanReport";
import {
  getScan,
  getScanDiff,
  getScanFindings,
} from "@/features/scans/services/scans";

type Params = PageProps<"/projects/[projectId]/scans/[scanId]">["params"];

export default function ScanPage({ params }: { params: Params }) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Scan params={params} />
      </Suspense>
    </main>
  );
}

async function Scan({ params }: { params: Params }) {
  const { projectId, scanId } = await params;
  const scan = await getScan(scanId);
  if (!scan.ok || scan.data.projectId !== projectId) notFound();

  const [findings, diff] =
    scan.data.status === "done"
      ? await Promise.all([getScanFindings(scanId), getScanDiff(scanId)])
      : [null, null];

  return (
    <ScanReport
      scan={scan.data}
      findings={findings}
      diff={diff?.ok ? diff.data : null}
    />
  );
}
