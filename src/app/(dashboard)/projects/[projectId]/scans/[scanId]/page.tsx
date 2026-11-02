import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FindingList } from "@/features/scans/components/FindingList";
import { ScanProgress } from "@/features/scans/components/ScanProgress";
import { SeveritySummary } from "@/features/scans/components/SeveritySummary";
import { getScan, getScanFindings } from "@/features/scans/services/scans";
import { formatDateTime } from "@/shared/lib/format";

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
  const findings =
    scan.data.status === "done" ? await getScanFindings(scanId) : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${projectId}`}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← 프로젝트
        </Link>
        <h1 className="text-2xl font-semibold">보안 점검 결과</h1>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(scan.data.createdAt)}
          {scan.data.commitSha
            ? ` · 커밋 ${scan.data.commitSha.slice(0, 7)}`
            : ""}
        </p>
      </div>
      <ScanProgress
        scanId={scanId}
        initial={{
          status: scan.data.status,
          progress: scan.data.progress,
          error: scan.data.error,
        }}
      />
      {scan.data.summary ? (
        <SeveritySummary summary={scan.data.summary} />
      ) : null}
      {findings?.ok ? <FindingList findings={findings.data} /> : null}
      {findings && !findings.ok ? (
        <p role="alert" className="text-destructive text-sm">
          {findings.error.message}
        </p>
      ) : null}
    </>
  );
}
