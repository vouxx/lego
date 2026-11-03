import "server-only";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  listContextFilesForRepo,
  markContextFilesOutdated,
} from "../repository";
import { contextAnalysisSchema } from "../schemas";
import { pushAffectsContext, pushEventSchema } from "./outdated";

/** push webhook: 규칙 파일 내용에 영향을 주는 변경이면 '업데이트 필요'로 표시한다. */
export async function handlePushEvent(
  payload: unknown,
): Promise<Result<{ handled: boolean }>> {
  const parsed = pushEventSchema.safeParse(payload);
  if (!parsed.success) {
    return err("invalid_payload", "push 이벤트 형식이 다릅니다.");
  }
  const event = parsed.data;
  if (!event.installation) return ok({ handled: false });

  const { data: files, error } = await listContextFilesForRepo(
    event.installation.id,
    event.repository.full_name,
  );
  if (error) return err("db_error", error.message);

  const outdatedIds = files
    .filter((f) => {
      const analysis = contextAnalysisSchema.safeParse(f.analysis);
      return (
        analysis.success && pushAffectsContext(event, analysis.data.rootEntries)
      );
    })
    .map((f) => f.id);
  if (outdatedIds.length === 0) return ok({ handled: false });

  const { error: updateError } = await markContextFilesOutdated(outdatedIds);
  return updateError
    ? err("db_error", updateError.message)
    : ok({ handled: true });
}
