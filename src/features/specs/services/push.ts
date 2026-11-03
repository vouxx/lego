import "server-only";
import { z } from "zod";
import { err, ok, type Result } from "@/shared/lib/result";
import { listTasksForRepo, markTasksDone } from "../repository";
import { taskKeysInMessage } from "./task-graph";

const pushCommitsSchema = z.object({
  ref: z.string(),
  repository: z.object({ full_name: z.string(), default_branch: z.string() }),
  installation: z.object({ id: z.number() }).optional(),
  commits: z
    .array(z.object({ id: z.string(), message: z.string() }))
    .default([]),
});

/**
 * push webhook: 기본 브랜치 커밋 메시지의 [T-3] 같은 작업 키로 연결된 스펙의 작업을 완료 처리한다.
 * 같은 키가 여러 스펙에 있으면 모두 완료된다(한 리포에 스펙 여러 개).
 */
export async function handleSpecPush(
  payload: unknown,
): Promise<Result<{ handled: boolean }>> {
  const parsed = pushCommitsSchema.safeParse(payload);
  if (!parsed.success) {
    return err("invalid_payload", "push 이벤트 형식이 다릅니다.");
  }
  const event = parsed.data;
  if (
    !event.installation ||
    event.ref !== `refs/heads/${event.repository.default_branch}`
  ) {
    return ok({ handled: false });
  }

  const commitByKey = new Map<string, string>();
  for (const commit of event.commits) {
    for (const key of taskKeysInMessage(commit.message)) {
      commitByKey.set(key, commit.id);
    }
  }
  if (commitByKey.size === 0) return ok({ handled: false });

  const { data: tasks, error } = await listTasksForRepo(
    event.installation.id,
    event.repository.full_name,
  );
  if (error) return err("db_error", error.message);

  const updates = tasks
    .filter((t) => t.status !== "done" && commitByKey.has(t.key))
    .map((t) => ({ id: t.id, commit: commitByKey.get(t.key)! }));
  if (updates.length === 0) return ok({ handled: false });

  const { error: updateError } = await markTasksDone(updates);
  return updateError
    ? err("db_error", updateError.message)
    : ok({ handled: true });
}
