import type { Result } from "@/shared/lib/result";
import type { ScanView } from "../schemas";
import { ScanHistory } from "./ScanHistory";

type Props = { projectId: string; scans: Result<ScanView[]> };

export function ScanHistorySection({ projectId, scans }: Props) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">점검 기록</h2>
      {scans.ok ? (
        <ScanHistory projectId={projectId} scans={scans.data} />
      ) : (
        <p role="alert" className="text-destructive text-sm">
          {scans.error.message}
        </p>
      )}
    </section>
  );
}
