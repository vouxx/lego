import "server-only";
import { assertRepoWrite } from "@/features/projects/services/repo-access";
import type { CurrentUser } from "@/lib/auth";
import { latestCommitSha } from "@/lib/github/repo-files";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  consumeScanQuota,
  enqueueScan,
  findActiveScan,
  findMyProject,
  getMyScan,
  getPreviousScanId,
  getScanDiffRows,
  insertScan,
  listProjectScans,
  listScanFindings,
  setFindingStatus,
} from "../repository";
import {
  scanSummarySchema,
  type FindingStatus,
  type FindingView,
  type ScanDiffView,
  type ScanStatus,
  type ScanView,
  type Severity,
  type AiVerdict,
} from "../schemas";

/** 스캔을 등록하고 큐에 넣는다. 이미 진행 중인 스캔이 있으면 그 스캔을 돌려준다. */
export async function startScan(
  user: CurrentUser,
  projectId: string,
): Promise<Result<{ scanId: string }>> {
  const { data: project, error } = await findMyProject(projectId);
  if (error) return err("db_error", "프로젝트를 불러오지 못했습니다.");
  if (!project || project.user_id !== user.id)
    return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const denied = await assertRepoWrite(user, project);
  if (denied) return denied;

  const { data: active } = await findActiveScan(projectId);
  if (active) return ok({ scanId: active.id });

  let commitSha: string;
  try {
    commitSha = await latestCommitSha(
      { installationId: project.installation_id },
      project.repo_full_name,
      project.default_branch,
    );
  } catch {
    return err(
      "github_error",
      project.installation_id === null
        ? "GitHub에서 리포를 읽지 못했습니다. 리포가 아직 공개 상태인지 확인해 주세요."
        : "GitHub에서 최신 커밋을 읽지 못했습니다. 리포 읽기 허용이 유지되어 있는지 확인해 주세요.",
    );
  }

  const { data: allowed, error: quotaError } = await consumeScanQuota(user.id);
  if (quotaError) return err("db_error", "사용량을 확인하지 못했습니다.");
  if (!allowed)
    return err("quota_exceeded", "이번 달 스캔 한도를 모두 사용했습니다.");

  const { data: scan, error: insertError } = await insertScan({
    projectId,
    userId: user.id,
    commitSha,
  });
  if (insertError) return err("db_error", "스캔을 등록하지 못했습니다.");

  const { error: queueError } = await enqueueScan(scan.id);
  if (queueError)
    return err("queue_error", "스캔 작업을 큐에 넣지 못했습니다.");

  return ok({ scanId: scan.id });
}

type ScanRow = {
  id: string;
  project_id: string;
  status: string;
  progress: number;
  commit_sha: string | null;
  summary: unknown;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

function toScanView(row: ScanRow): ScanView {
  const summary = scanSummarySchema.safeParse(row.summary);
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status as ScanStatus,
    progress: row.progress,
    commitSha: row.commit_sha,
    summary: summary.success ? summary.data : null,
    error: row.error,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

export async function getProjectScans(
  projectId: string,
): Promise<Result<ScanView[]>> {
  const { data, error } = await listProjectScans(projectId);
  if (error) return err("db_error", "스캔 기록을 불러오지 못했습니다.");
  return ok(data.map(toScanView));
}

export async function getScan(scanId: string): Promise<Result<ScanView>> {
  const { data, error } = await getMyScan(scanId);
  if (error) return err("db_error", "스캔을 불러오지 못했습니다.");
  if (!data) return err("not_found", "스캔을 찾을 수 없습니다.");
  return ok(toScanView(data));
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export async function getScanFindings(
  scanId: string,
): Promise<Result<FindingView[]>> {
  const { data, error } = await listScanFindings(scanId);
  if (error) return err("db_error", "발견 항목을 불러오지 못했습니다.");

  const findings: FindingView[] = data.map((f) => ({
    id: f.id,
    ruleId: f.rule_id,
    ruleTitle: f.rules?.title ?? f.rule_id,
    severity: f.severity as Severity,
    filePath: f.file_path,
    lineStart: f.line_start,
    lineEnd: f.line_end,
    snippet: f.snippet,
    aiVerdict: f.ai_verdict as AiVerdict | null,
    explanation: f.explanation,
    fixPrompt: f.fix_prompt,
    status: f.status as FindingStatus,
  }));
  return ok(
    findings.sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        a.filePath.localeCompare(b.filePath),
    ),
  );
}

export async function changeFindingStatus(
  findingId: string,
  status: FindingStatus,
) {
  const { data, error } = await setFindingStatus(findingId, status);
  if (error) return err("db_error", "상태를 바꾸지 못했습니다.");
  if (!data) return err("not_found", "발견 항목을 찾을 수 없습니다.");
  return ok({ id: data.id, status: data.status as FindingStatus });
}

/** 직전 스캔 대비 새로 생긴/해결된 항목. 직전 스캔이 없으면 null. */
export async function getScanDiff(
  scanId: string,
): Promise<Result<ScanDiffView | null>> {
  const { data: previousScanId, error } = await getPreviousScanId(scanId);
  if (error) return err("db_error", "이전 점검 결과를 불러오지 못했습니다.");
  if (!previousScanId) return ok(null);

  const { data: rows, error: diffError } = await getScanDiffRows(scanId);
  if (diffError)
    return err("db_error", "이전 점검 결과와 비교하지 못했습니다.");
  return ok({
    previousScanId,
    newFindingIds: rows
      .filter((r) => r.change === "new")
      .map((r) => r.finding_id),
    unchangedCount: rows.filter((r) => r.change === "unchanged").length,
    fixed: rows
      .filter((r) => r.change === "fixed")
      .map((r) => ({
        fingerprint: r.fingerprint,
        ruleId: r.rule_id,
        severity: r.severity as Severity,
        filePath: r.file_path,
        lineStart: r.line_start,
      }))
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          a.filePath.localeCompare(b.filePath),
      ),
  });
}
