import "server-only";
import { err, ok, type Result } from "@/shared/lib/result";
import { deleteExplanationRow, getMyExplanation } from "../repository";

/** 내 설명인지 RLS 로 확인한 뒤 지운다. */
export async function deleteExplanation(
  explanationId: string,
): Promise<Result<null>> {
  const { data } = await getMyExplanation(explanationId);
  if (!data) return err("not_found", "설명을 찾을 수 없습니다.");
  const { error } = await deleteExplanationRow(explanationId);
  return error ? err("db_error", "설명을 지우지 못했습니다.") : ok(null);
}
