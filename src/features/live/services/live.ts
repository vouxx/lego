import "server-only";
import { randomBytes } from "node:crypto";
import {
  BlockedUrlError,
  assertPublicUrl,
  safeFetch,
} from "@/lib/net/safe-fetch";
import { reportError } from "@/lib/monitoring";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  deleteTarget,
  findMyProject,
  getLatestScanCommit,
  getMyTarget,
  getPreviousResults,
  getTargetForWorker,
  insertCheck,
  listDueTargets,
  listMyChecks,
  listMyProjectsWithTargets,
  listMyRecentChecks,
  updateCheck,
  updateTarget,
  upsertTarget,
} from "../repository";
import {
  liveResultSchema,
  liveSummarySchema,
  VERIFY_PATH,
  type LiveCheckView,
  type LiveOverviewRow,
  type Severity,
  type LiveResult,
  type LiveTargetView,
} from "../schemas";
import { probeSite } from "./probe";

// 수동 점검 사이 최소 간격(남의 서버에 부담을 주지 않게)
const MANUAL_GAP_MS = 2 * 60 * 1000;

const key = (r: { id: string; target: string }) => `${r.id}|${r.target}`;

/** 화면용: 대상과 최근 점검 */
export async function getLivePage(projectId: string) {
  const { data: project } = await findMyProject(projectId);
  if (!project) return null;
  const { data: target } = await getMyTarget(projectId);
  if (!target) return { project, target: null, checks: [] };
  const { data: rows } = await listMyChecks(target.id);
  const checks: LiveCheckView[] = (rows ?? []).map((c) => ({
    id: c.id,
    trigger: c.trigger as LiveCheckView["trigger"],
    status: c.status as LiveCheckView["status"],
    results: liveResultSchema.array().catch([]).parse(c.results),
    summary: liveSummarySchema.parse(c.summary ?? {}),
    error: c.error,
    createdAt: c.created_at,
  }));
  const view: LiveTargetView = {
    id: target.id,
    siteUrl: target.site_url,
    verifyToken: target.verify_token,
    verified: !!target.verified_at,
    lastCheckedAt: target.last_checked_at,
  };
  return { project, target: view, checks };
}

/** 배포 주소를 등록한다. 주소를 바꾸면 소유 확인을 다시 해야 한다. */
export async function createTarget(
  projectId: string,
  siteUrl: string,
): Promise<Result<{ token: string }>> {
  const { data: project } = await findMyProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  let origin: string;
  try {
    origin = (await assertPublicUrl(siteUrl)).origin;
  } catch (e) {
    return err(
      "invalid_url",
      e instanceof BlockedUrlError ? e.message : "주소를 확인해 주세요.",
    );
  }
  const token = `lego-verify-${randomBytes(18).toString("base64url")}`;
  const { error } = await upsertTarget({
    project_id: projectId,
    user_id: project.user_id,
    site_url: origin,
    verify_token: token,
    verified_at: null,
    last_checked_at: null,
  });
  return error ? err("db_error", error.message) : ok({ token });
}

/** 사이트의 /.well-known/lego-verify.txt 에 토큰이 있으면 소유를 확인한다. */
export async function verifyTarget(
  projectId: string,
): Promise<Result<{ verified: true }>> {
  const { data: target } = await getMyTarget(projectId);
  if (!target) return err("not_found", "먼저 배포 주소를 등록해 주세요.");
  try {
    const res = await safeFetch(
      new URL(VERIFY_PATH, target.site_url).toString(),
    );
    if (res.status !== 200 || !res.body.includes(target.verify_token))
      return err(
        "not_verified",
        `${VERIFY_PATH} 에서 확인 토큰을 찾지 못했습니다(응답 ${res.status}). 파일을 배포했는지 확인해 주세요.`,
      );
  } catch (e) {
    return err(
      "unreachable",
      e instanceof BlockedUrlError
        ? e.message
        : "사이트에 연결하지 못했습니다.",
    );
  }
  const { error } = await updateTarget(target.id, {
    verified_at: new Date().toISOString(),
  });
  return error ? err("db_error", error.message) : ok({ verified: true });
}

export async function removeTarget(
  projectId: string,
): Promise<Result<{ removed: true }>> {
  const { data: target } = await getMyTarget(projectId);
  if (!target) return ok({ removed: true });
  const { error } = await deleteTarget(target.id);
  return error ? err("db_error", error.message) : ok({ removed: true });
}

/** 지금 점검(화면 버튼). 소유 확인을 마쳤고 최근 2분 안에 점검하지 않았어야 한다. */
export async function runManualCheck(
  projectId: string,
): Promise<Result<{ checkId: string }>> {
  const { data: target } = await getMyTarget(projectId);
  if (!target) return err("not_found", "먼저 배포 주소를 등록해 주세요.");
  if (!target.verified_at)
    return err("not_verified", "소유 확인을 먼저 해 주세요.");
  if (
    target.last_checked_at &&
    Date.now() - Date.parse(target.last_checked_at) < MANUAL_GAP_MS
  )
    return err(
      "too_soon",
      "점검은 2분에 한 번만 할 수 있습니다. 잠시 뒤에 다시 눌러 주세요.",
    );
  return runCheck(target.id, "manual");
}

/** 점검 하나를 끝까지 실행하고 결과를 저장한다. 직전 점검에 없던 항목은 '새로 생김' 표시. */
export async function runCheck(
  targetId: string,
  trigger: "manual" | "daily",
): Promise<Result<{ checkId: string }>> {
  const { data: target } = await getTargetForWorker(targetId);
  const project = target?.projects;
  if (!target?.verified_at || !project)
    return err("not_found", "점검할 대상이 없습니다.");
  await updateTarget(targetId, { last_checked_at: new Date().toISOString() });
  const { data: check, error } = await insertCheck({
    target_id: targetId,
    user_id: target.user_id,
    trigger,
  });
  if (error || !check)
    return err("db_error", error?.message ?? "점검을 만들지 못했습니다.");

  try {
    const { data: scan } = await getLatestScanCommit(project.id);
    const result = await probeSite(target.site_url, {
      installationId: project.installation_id,
      repoFullName: project.repo_full_name,
      commitSha: scan?.commit_sha ?? null,
    });
    const { data: previous } = await getPreviousResults(targetId, check.id);
    const before = new Set(
      liveResultSchema
        .array()
        .catch([])
        .parse(previous?.results ?? [])
        .map(key),
    );
    const results: LiveResult[] = result.findings.map((f) => ({
      ...f,
      isNew: previous ? !before.has(key(f)) : false,
    }));
    await updateCheck(check.id, {
      status: "done",
      results,
      summary: {
        requests: result.requests,
        supabase: result.supabase,
        tables: result.tables,
        buckets: result.buckets,
        scripts: result.scripts,
        notes: result.notes,
      },
      finished_at: new Date().toISOString(),
    });
    return ok({ checkId: check.id });
  } catch (e) {
    reportError(e, { area: "live.check", extra: { targetId } });
    await updateCheck(check.id, {
      status: "failed",
      error: e instanceof Error ? e.message : "점검하지 못했습니다.",
      finished_at: new Date().toISOString(),
    });
    return err(
      "check_failed",
      e instanceof Error ? e.message : "점검하지 못했습니다.",
    );
  }
}

/** 워커(/api/scan-worker)가 부른다: 하루가 지난 대상을 몇 개씩 점검한다. */
export async function runDueLiveChecks(limit = 3) {
  const { data } = await listDueTargets(limit);
  let checked = 0;
  for (const { id } of data ?? []) {
    const result = await runCheck(id, "daily");
    if (result.ok) checked++;
  }
  return { checked };
}

/** 운영 점검 메뉴: 프로젝트마다 점검 대상과 가장 최근 결과 */
export async function getLiveOverview(): Promise<LiveOverviewRow[]> {
  const { data: projects } = await listMyProjectsWithTargets();
  const rows = projects ?? [];
  const target = (p: (typeof rows)[number]) =>
    Array.isArray(p.live_targets) ? p.live_targets[0] : p.live_targets;
  const ids = rows.map(target).flatMap((t) => (t ? [t.id] : []));
  const { data: checks } = await listMyRecentChecks(ids);
  const latest = new Map<string, NonNullable<typeof checks>[number]>();
  for (const c of checks ?? [])
    if (!latest.has(c.target_id)) latest.set(c.target_id, c);

  return rows.map((p) => {
    const t = target(p);
    const check = t ? latest.get(t.id) : undefined;
    const results = check
      ? liveResultSchema.array().catch([]).parse(check.results)
      : [];
    const counts: Partial<Record<Severity, number>> = {};
    for (const r of results) counts[r.severity] = (counts[r.severity] ?? 0) + 1;
    return {
      projectId: p.id,
      repoFullName: p.repo_full_name,
      siteUrl: t?.site_url ?? null,
      verified: !!t?.verified_at,
      lastCheck: check
        ? {
            status: check.status as LiveCheckView["status"],
            createdAt: check.created_at,
            counts,
            newCount: results.filter((r) => r.isNew).length,
          }
        : null,
    };
  });
}
