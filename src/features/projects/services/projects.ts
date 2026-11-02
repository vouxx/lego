import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { installationOctokit } from "@/lib/github/app";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  getMyProject,
  insertProject,
  listMyInstallations,
  listMyProjects,
} from "../repository";
import {
  detectedStackSchema,
  type InstallableRepo,
  type ProjectSummary,
} from "../schemas";
import { detectStack } from "./detect-stack";

export async function getMyProjects(): Promise<Result<ProjectSummary[]>> {
  const { data, error } = await listMyProjects();
  if (error) return err("db_error", "프로젝트 목록을 불러오지 못했습니다.");

  return ok(
    data.map((p) => {
      const stack = detectedStackSchema.safeParse(p.detected_stack);
      return {
        id: p.id,
        repoFullName: p.repo_full_name,
        defaultBranch: p.default_branch,
        stack: stack.success ? stack.data : null,
      };
    }),
  );
}

export async function getProject(
  projectId: string,
): Promise<Result<ProjectSummary>> {
  const { data, error } = await getMyProject(projectId);
  if (error) return err("db_error", "프로젝트를 불러오지 못했습니다.");
  if (!data) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const stack = detectedStackSchema.safeParse(data.detected_stack);
  return ok({
    id: data.id,
    repoFullName: data.repo_full_name,
    defaultBranch: data.default_branch,
    stack: stack.success ? stack.data : null,
  });
}

export async function getMyInstallations() {
  const { data, error } = await listMyInstallations();
  if (error) return err("db_error", "GitHub 연결 정보를 불러오지 못했습니다.");
  return ok(
    data.map((i) => ({
      installationId: i.installation_id,
      accountLogin: i.account_login,
    })),
  );
}

/** 내 GitHub App 설치들이 접근할 수 있는 리포 목록. */
export async function listInstallableRepos(): Promise<
  Result<InstallableRepo[]>
> {
  const [installations, projects] = await Promise.all([
    getMyInstallations(),
    getMyProjects(),
  ]);
  if (!installations.ok) return installations;
  if (!projects.ok) return projects;

  const added = new Set(projects.data.map((p) => p.repoFullName));

  // 설치마다 따로 묻는다. 다른 GitHub App(개발용 등)의 설치나 이미 지운 설치는
  // 이 App 으로 접근할 수 없으므로 건너뛰고, 모두 실패할 때만 오류로 본다.
  const perInstallation = await Promise.allSettled(
    installations.data.map(async ({ installationId }) => {
      const octokit = await installationOctokit(installationId);
      const repos = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: 100 },
      );
      return repos.map((r) => ({
        fullName: r.full_name,
        installationId,
        defaultBranch: r.default_branch,
        isPrivate: r.private,
        alreadyAdded: added.has(r.full_name),
      }));
    }),
  );
  const repos = perInstallation.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  if (
    installations.data.length > 0 &&
    perInstallation.every((r) => r.status === "rejected")
  ) {
    return err("github_error", "GitHub에서 리포 목록을 불러오지 못했습니다.");
  }
  return ok(repos.sort((a, b) => a.fullName.localeCompare(b.fullName)));
}

async function readRepoSnapshot(
  installationId: number,
  fullName: string,
  ref: string,
) {
  const octokit = await installationOctokit(installationId);
  const [owner, repo] = fullName.split("/") as [string, string];

  const listDir = async (path: string) => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      return Array.isArray(data) ? data.map((e) => e.name) : [];
    } catch {
      return [];
    }
  };

  const readPackageJson = async () => {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "package.json",
        ref,
      });
      if (Array.isArray(data) || data.type !== "file" || !("content" in data))
        return null;
      return JSON.parse(
        Buffer.from(data.content, "base64").toString("utf8"),
      ) as unknown;
    } catch {
      return null;
    }
  };

  const [rootEntries, srcEntries, packageJson] = await Promise.all([
    listDir(""),
    listDir("src"),
    readPackageJson(),
  ]);
  return { rootEntries, srcEntries, packageJson };
}

/** 내 설치로 접근 가능한 리포만 프로젝트로 등록한다. */
export async function createProject(
  user: CurrentUser,
  repoFullName: string,
): Promise<Result<{ projectId: string }>> {
  const repos = await listInstallableRepos();
  if (!repos.ok) return repos;

  const repo = repos.data.find((r) => r.fullName === repoFullName);
  if (!repo)
    return err(
      "repo_not_accessible",
      "연결된 GitHub App으로 접근할 수 없는 리포입니다.",
    );
  if (repo.alreadyAdded) return err("already_added", "이미 등록한 리포입니다.");

  let snapshot;
  try {
    snapshot = await readRepoSnapshot(
      repo.installationId,
      repo.fullName,
      repo.defaultBranch,
    );
  } catch {
    return err("github_error", "리포 정보를 읽지 못했습니다.");
  }

  const { data, error } = await insertProject({
    userId: user.id,
    installationId: repo.installationId,
    repoFullName: repo.fullName,
    defaultBranch: repo.defaultBranch,
    detectedStack: detectStack(snapshot),
  });
  if (error) return err("db_error", "프로젝트를 저장하지 못했습니다.");

  return ok({ projectId: data.id });
}
