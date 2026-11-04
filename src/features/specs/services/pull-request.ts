import "server-only";
import { z } from "zod";
import { err, ok, type Result } from "@/shared/lib/result";
import { listTasksForRepo, markTasksDone, upsertTaskPrs } from "../repository";
import { taskKeysInMessage } from "./task-graph";

const pullRequestSchema = z.object({
  action: z.string(),
  installation: z.object({ id: z.number() }).optional(),
  repository: z.object({ full_name: z.string() }),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    html_url: z.string(),
    merged: z.boolean().nullable().default(false),
    merge_commit_sha: z.string().nullable().optional(),
    head: z.object({ ref: z.string().default("") }),
  }),
});

const TRACKED = new Set([
  "opened",
  "reopened",
  "edited",
  "synchronize",
  "closed",
]);

/** 브랜치 이름의 t-3, T-3 도 작업 키로 본다(feature/t-3-login). */
function taskKeysInBranch(ref: string) {
  return [...new Set([...ref.matchAll(/(?:^|[^a-z0-9])t-(\d+)(?![0-9])/gi)])]
    .map((m) => `T-${m[1]}`)
    .filter((k, i, all) => all.indexOf(k) === i);
}

/**
 * pull_request webhook: PR 제목·브랜치 이름의 [T-n] 으로 스펙 작업과 PR 을 잇는다.
 * 열림·닫힘·머지됨 상태를 남기고, 머지되면 작업을 완료한다(머지 커밋으로).
 * PR 가드를 켜지 않은 프로젝트도 이어진다.
 */
export async function handleSpecPullRequest(
  payload: unknown,
): Promise<Result<{ handled: boolean }>> {
  const parsed = pullRequestSchema.safeParse(payload);
  if (!parsed.success)
    return err("invalid_payload", "pull_request 이벤트 형식이 다릅니다.");
  const { action, installation, repository, pull_request: pr } = parsed.data;
  if (!installation || !TRACKED.has(action)) return ok({ handled: false });

  const keys = new Set([
    ...taskKeysInMessage(pr.title),
    ...taskKeysInBranch(pr.head.ref),
  ]);
  if (keys.size === 0) return ok({ handled: false });

  const { data: tasks, error } = await listTasksForRepo(
    installation.id,
    repository.full_name,
  );
  if (error) return err("db_error", error.message);
  const matched = (tasks ?? []).filter((t) => keys.has(t.key));
  if (matched.length === 0) return ok({ handled: false });

  const merged = action === "closed" && pr.merged === true;
  const state = merged ? "merged" : action === "closed" ? "closed" : "open";
  const { error: linkError } = await upsertTaskPrs(
    matched.map((t) => ({
      task_id: t.id,
      user_id: t.user_id,
      repo_full_name: repository.full_name,
      pr_number: pr.number,
      pr_title: pr.title,
      pr_url: pr.html_url,
      state,
      updated_at: new Date().toISOString(),
    })),
  );
  if (linkError) return err("db_error", linkError.message);

  if (merged) {
    const done = matched
      .filter((t) => t.status !== "done")
      .map((t) => ({ id: t.id, commit: pr.merge_commit_sha ?? "" }));
    if (done.length > 0) {
      const { error: doneError } = await markTasksDone(
        done.map((d) => ({ ...d, commit: d.commit || `PR #${pr.number}` })),
      );
      if (doneError) return err("db_error", doneError.message);
    }
  }
  return ok({ handled: true });
}
