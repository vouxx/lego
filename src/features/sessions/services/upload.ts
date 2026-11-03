import "server-only";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import type { CurrentUser } from "@/lib/auth";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  createUploadUrl,
  deleteSessionRow,
  findMyProject,
  getMySession,
  insertSession,
  overwriteSessionFile,
  removeSessionFile,
  updateSession,
} from "../repository";
import type { SessionTool } from "../schemas";
import { analyzeSession, isAnalysisStale } from "./analyze";
import { readSessionFile } from "./files";
import { maskMessages } from "./mask";
import { computeStats } from "./stats";

/** 세션 행을 만들고 Storage 서명 업로드 URL 을 발급한다. 파일은 브라우저가 직접 올린다. */
export async function createSessionUpload(
  user: CurrentUser,
  input: { tool: SessionTool; title: string; projectId: string | null },
): Promise<Result<{ sessionId: string; uploadUrl: string }>> {
  if (input.projectId) {
    const { data } = await findMyProject(input.projectId);
    if (!data) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  }
  const path = `${user.id}/${randomUUID()}.json`;
  const inserted = await insertSession({
    user_id: user.id,
    project_id: input.projectId,
    tool: input.tool,
    title: input.title,
    storage_path: path,
  });
  if (inserted.error) return err("db_error", "세션을 만들지 못했습니다.");

  const { data, error } = await createUploadUrl(path);
  if (error || !data) {
    await deleteSessionRow(inserted.data.id);
    return err("storage_error", "업로드 주소를 만들지 못했습니다.");
  }
  return ok({ sessionId: inserted.data.id, uploadUrl: data.signedUrl });
}

/**
 * 업로드가 끝난 파일을 검사한다. 서버에서 한 번 더 마스킹해서 바뀐 게 있으면 덮어쓰고,
 * 통계를 계산한 뒤 분석을 시작한다.
 */
export async function finalizeSession(
  sessionId: string,
  clientMaskedCount: number,
): Promise<Result<{ sessionId: string }>> {
  const { data: session } = await getMySession(sessionId);
  if (!session) return err("not_found", "세션을 찾을 수 없습니다.");
  if (session.status !== "uploading") return ok({ sessionId });

  const file = await readSessionFile(session.storage_path);
  if (!file || file.messages.length === 0) {
    await updateSession(sessionId, {
      status: "failed",
      error: "올린 파일을 읽지 못했습니다.",
    });
    return err("bad_file", "올린 파일을 읽지 못했습니다. 다시 올려 주세요.");
  }

  const second = maskMessages(file.messages);
  if (second.count > 0) {
    const { error } = await overwriteSessionFile(
      session.storage_path,
      JSON.stringify({ ...file, messages: second.messages }),
    );
    if (error) return err("storage_error", "파일을 저장하지 못했습니다.");
  }
  const stats = computeStats(second.messages, clientMaskedCount + second.count);
  await updateSession(sessionId, { status: "queued", stats });
  after(() => analyzeSession(sessionId));
  return ok({ sessionId });
}

export async function retryAnalysis(sessionId: string): Promise<Result<null>> {
  const { data: session } = await getMySession(sessionId);
  if (!session) return err("not_found", "세션을 찾을 수 없습니다.");
  const canRetry =
    session.status === "failed" ||
    session.status === "queued" ||
    (session.status === "analyzing" &&
      isAnalysisStale(session.analysis_started_at));
  if (!canRetry) return err("busy", "이미 분석하고 있습니다.");
  await updateSession(sessionId, { status: "queued", error: null });
  after(() => analyzeSession(sessionId));
  return ok(null);
}

export async function deleteSession(sessionId: string): Promise<Result<null>> {
  const { data: session } = await getMySession(sessionId);
  if (!session) return err("not_found", "세션을 찾을 수 없습니다.");
  await removeSessionFile(session.storage_path);
  const { error } = await deleteSessionRow(sessionId);
  return error ? err("db_error", "세션을 지우지 못했습니다.") : ok(null);
}
