import "server-only";
import { latestCommitSha } from "@/lib/github/repo-files";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  findMyContextFile,
  findMyProject,
  getVersionContents,
  listContextVersions,
} from "../repository";
import type {
  ChecklistGroup,
  ContextTarget,
  ContextVersionSummary,
  PrAvailability,
} from "../schemas";
import { prAvailability } from "./edit";
import { renderForFile } from "./rules";

export type ContextFileView = {
  id: string;
  outdated: boolean;
  /** 분석한 뒤 기본 브랜치에 새 커밋이 생겼는지 */
  hasNewCommit: boolean;
  content: string;
  /** 직전 버전 내용(비교용). 첫 버전이면 null */
  previousContent: string | null;
  groups: ChecklistGroup[];
  versions: ContextVersionSummary[];
  pr: PrAvailability;
};

export type ContextView = {
  project: { id: string; repoFullName: string };
  target: ContextTarget;
  file: ContextFileView | null;
};

const COMMIT_CHECK_MS = 3_000;

async function newestCommit(
  installationId: number | null,
  repoFullName: string,
  branch: string,
) {
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), COMMIT_CHECK_MS),
  );
  return Promise.race([
    latestCommitSha({ installationId }, repoFullName, branch).catch(() => null),
    timeout,
  ]);
}

export async function getContextView(
  projectId: string,
  target: ContextTarget,
): Promise<Result<ContextView>> {
  const { data: project } = await findMyProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const base = {
    project: { id: project.id, repoFullName: project.repo_full_name },
    target,
  };

  const { data: file } = await findMyContextFile(projectId, target);
  if (!file?.current_version_id) return ok({ ...base, file: null });

  const [rendered, versions, latest, pr] = await Promise.all([
    renderForFile(file),
    listContextVersions(file.id),
    newestCommit(
      project.installation_id,
      project.repo_full_name,
      project.default_branch,
    ),
    prAvailability(project.installation_id),
  ]);
  if (!rendered.ok) return rendered;
  if (versions.error)
    return err("db_error", "버전 기록을 불러오지 못했습니다.");

  const previousId = versions.data.find(
    (v) => v.id !== file.current_version_id,
  )?.id;
  const ids = [file.current_version_id, previousId].filter((id): id is string =>
    Boolean(id),
  );
  const { data: contents } = await getVersionContents(ids);
  const contentOf = (id: string | undefined) =>
    contents?.find((c) => c.id === id)?.content ?? null;

  return ok({
    ...base,
    file: {
      id: file.id,
      outdated: file.outdated,
      hasNewCommit: Boolean(latest && latest !== file.analyzed_commit),
      content: contentOf(file.current_version_id) ?? rendered.data.content,
      previousContent: contentOf(previousId),
      groups: rendered.data.groups,
      versions: versions.data.map((v) => ({
        id: v.id,
        source: v.source === "edited" ? "edited" : "generated",
        createdAt: v.created_at,
        prUrl: v.pr_url,
      })),
      pr,
    },
  });
}
