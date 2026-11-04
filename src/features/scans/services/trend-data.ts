import "server-only";
import { listTrendFindings, listTrendScans } from "../repository";
import type { Severity } from "../schemas";
import { computeTrend, type ProjectTrend } from "./trend";

/** 프로젝트 화면의 보안 추이(끝난 점검 최근 30개) */
export async function getProjectTrend(
  projectId: string,
): Promise<ProjectTrend> {
  const { data: scans } = await listTrendScans(projectId);
  if (!scans || scans.length === 0)
    return { points: [], medianDaysToFix: null, fixedTotal: 0 };
  const { data: findings } = await listTrendFindings(scans.map((s) => s.id));
  return computeTrend(
    scans.map((s) => ({ id: s.id, createdAt: s.created_at })),
    (findings ?? []).map((f) => ({
      scanId: f.scan_id,
      fingerprint: f.fingerprint,
      severity: f.severity as Severity,
      aiVerdict: f.ai_verdict,
      status: f.status,
    })),
  );
}
