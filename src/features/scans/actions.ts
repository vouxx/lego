"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { err, type Result } from "@/shared/lib/result";
import {
  findingStatusInput,
  prGuardInput,
  startScanInput,
  type FindingStatus,
} from "./schemas";
import { changePrGuard } from "./services/pr-reviews";
import { changeFindingStatus, startScan } from "./services/scans";
import { runScanWorker } from "./services/worker";

export async function startScanAction(
  input: unknown,
): Promise<Result<{ scanId: string }>> {
  const parsed = startScanInput.safeParse(input);
  if (!parsed.success)
    return err("invalid_input", "프로젝트 정보가 올바르지 않습니다.");

  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");

  const result = await startScan(user, parsed.data.projectId);
  if (result.ok) {
    // 응답을 보낸 뒤 같은 서버에서 바로 큐를 처리한다. 배포 환경에서는 pg_cron 이 /api/scan-worker 도 부른다.
    after(() =>
      runScanWorker().catch((e) => console.error("[scan-worker]", e)),
    );
    revalidatePath(`/projects/${parsed.data.projectId}`);
  }
  return result;
}

export async function updateFindingStatusAction(
  input: unknown,
): Promise<Result<{ id: string; status: FindingStatus }>> {
  const parsed = findingStatusInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");

  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");

  // RLS 와 컬럼 권한이 자기 항목의 status 만 바꾸도록 막는다.
  return changeFindingStatus(parsed.data.findingId, parsed.data.status);
}

export async function setPrGuardAction(
  input: unknown,
): Promise<Result<{ enabled: boolean }>> {
  const parsed = prGuardInput.safeParse(input);
  if (!parsed.success) return err("invalid_input", "요청이 올바르지 않습니다.");
  const user = await getCurrentUser();
  if (!user) return err("unauthorized", "로그인이 필요합니다.");
  const result = await changePrGuard(
    parsed.data.projectId,
    parsed.data.enabled,
  );
  if (result.ok) revalidatePath(`/projects/${parsed.data.projectId}`);
  return result;
}
