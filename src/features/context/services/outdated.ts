import { z } from "zod";

export const pushEventSchema = z.object({
  ref: z.string(),
  repository: z.object({
    full_name: z.string(),
    default_branch: z.string(),
  }),
  installation: z.object({ id: z.number() }).optional(),
  commits: z
    .array(
      z.object({
        added: z.array(z.string()).default([]),
        removed: z.array(z.string()).default([]),
        modified: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
export type PushEvent = z.infer<typeof pushEventSchema>;

const STACK_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lock",
  "bun.lockb",
  "tsconfig.json",
]);

/**
 * 기본 브랜치 push 가 규칙 파일 내용에 영향을 주는지.
 * package.json·lockfile 이 바뀌었거나, 분석할 때 없던 최상위 폴더·파일이 생겼거나,
 * 최상위 파일이 사라졌으면 true.
 */
export function pushAffectsContext(event: PushEvent, rootEntries: string[]) {
  if (event.ref !== `refs/heads/${event.repository.default_branch}`) {
    return false;
  }
  const known = new Set(rootEntries);
  return event.commits.some(
    (c) =>
      [...c.added, ...c.removed, ...c.modified].some((p) =>
        STACK_FILES.has(p),
      ) ||
      c.added.some((p) => !known.has(p.split("/")[0]!)) ||
      c.removed.some((p) => !p.includes("/")),
  );
}
