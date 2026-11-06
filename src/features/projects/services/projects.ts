import "server-only";
import { getProjectAccess } from "@/features/members/services/access";
import type { CurrentUser } from "@/lib/auth";
import { installationOctokit } from "@/lib/github/app";
import { canWrite, repoPermission } from "@/lib/github/repo-access";
import {
  PublicRepoNotFoundError,
  publicRepoRefs,
  readRepoAtCommit,
} from "@/lib/github/repo-files";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  deleteProjectRow,
  getMyProject,
  insertProject,
  listMyInstallations,
  listMyProjects,
} from "../repository";
import { detectRepoStack, detectStack } from "@/shared/stack/detect";
import { detectedStackSchema } from "@/shared/stack/schema";
import type { InstallableRepo, ProjectSummary } from "../schemas";
import { parseRepoInput } from "./repo-url";

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
  const access = await getProjectAccess(projectId);
  if (!access) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const stack = detectedStackSchema.safeParse(access.detectedStack);
  return ok({
    id: projectId,
    repoFullName: access.repoFullName,
    defaultBranch: access.defaultBranch,
    stack: stack.success ? stack.data : null,
    role: access.role,
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

const MAX_PROJECTS = 30;
const MAX_CHECKED_REPOS = 200;
const PERMISSION_CONCURRENCY = 8;

/** 조직 설치의 리포는 쓰기 권한이 있는 것만 남긴다. 내 계정 설치는 전부 내 리포다. */
async function writableRepos<T extends { fullName: string }>(
  user: CurrentUser,
  installationId: number,
  repos: T[],
) {
  const queue = repos.slice(0, MAX_CHECKED_REPOS);
  const allowed = new Set<string>();
  const check = async () => {
    for (let repo = queue.shift(); repo; repo = queue.shift()) {
      const permission = await repoPermission(
        installationId,
        repo.fullName,
        user.githubLogin,
      );
      if (canWrite(permission)) allowed.add(repo.fullName);
    }
  };
  await Promise.all(
    Array.from({ length: PERMISSION_CONCURRENCY }, () => check()),
  );
  return repos.filter((r) => allowed.has(r.fullName));
}

/** 내 GitHub App 설치의 리포 중 내가 쓰기 권한을 가진 리포 목록. */
export async function listInstallableRepos(
  user: CurrentUser,
): Promise<Result<InstallableRepo[]>> {
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
    installations.data.map(async ({ installationId, accountLogin }) => {
      const octokit = await installationOctokit(installationId);
      const repos = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: 100 },
      );
      const mapped = repos.map((r) => ({
        fullName: r.full_name,
        installationId,
        defaultBranch: r.default_branch,
        isPrivate: r.private,
        alreadyAdded: added.has(r.full_name),
      }));
      const isMine =
        accountLogin.toLowerCase() === user.githubLogin.toLowerCase();
      return isMine ? mapped : writableRepos(user, installationId, mapped);
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

const tooManyProjects = (count: number) =>
  count >= MAX_PROJECTS
    ? err(
        "too_many_projects",
        `프로젝트는 ${MAX_PROJECTS}개까지 등록할 수 있습니다.`,
      )
    : null;

/** 내가 쓰기 권한을 가진 설치 리포만 프로젝트로 등록한다. */
export async function createProject(
  user: CurrentUser,
  repoFullName: string,
): Promise<Result<{ projectId: string }>> {
  const repos = await listInstallableRepos(user);
  if (!repos.ok) return repos;
  const mine = await getMyProjects();
  if (!mine.ok) return mine;
  const limited = tooManyProjects(mine.data.length);
  if (limited) return limited;

  const repo = repos.data.find((r) => r.fullName === repoFullName);
  if (!repo)
    return err(
      "repo_not_accessible",
      "읽기를 허용하지 않았거나 쓰기 권한이 없는 리포입니다.",
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

/**
 * 공개 리포를 GitHub App 설치 없이 URL 로 등록한다.
 * 다른 사람 리포의 취약점을 찾아 주는 도구가 되지 않도록, 로그인한 GitHub 계정이 소유한 리포만 받는다.
 */
export async function addPublicRepo(
  user: CurrentUser,
  input: string,
): Promise<Result<{ projectId: string }>> {
  const fullName = parseRepoInput(input);
  if (!fullName)
    return err(
      "invalid_repo_url",
      "GitHub 리포 주소를 알아보지 못했습니다. 예: https://github.com/owner/repo",
    );

  const owner = fullName.split("/")[0]!;
  if (owner.toLowerCase() !== user.githubLogin.toLowerCase())
    return err(
      "not_owner",
      `URL로는 내 계정(${user.githubLogin})의 공개 리포만 추가할 수 있습니다. 조직이나 다른 사람의 리포는 아래에서 읽기를 허용해 주세요.`,
    );

  const projects = await getMyProjects();
  if (!projects.ok) return projects;
  const limited = tooManyProjects(projects.data.length);
  if (limited) return limited;
  if (
    projects.data.some(
      (p) => p.repoFullName.toLowerCase() === fullName.toLowerCase(),
    )
  )
    return err("already_added", "이미 등록한 리포입니다.");

  let refs;
  try {
    refs = await publicRepoRefs(fullName);
  } catch (error) {
    if (error instanceof PublicRepoNotFoundError)
      return err(
        "not_public",
        "공개 리포를 찾지 못했습니다. 비공개 리포라면 아래에서 읽기를 허용해 주세요.",
      );
    return err("github_error", "GitHub에서 리포를 읽지 못했습니다.");
  }

  let detectedStack;
  try {
    const snapshot = await readRepoAtCommit(
      { installationId: null },
      fullName,
      refs.head!.sha,
    );
    detectedStack = detectRepoStack(
      snapshot.paths,
      snapshot.files.filter((f) => f.path.endsWith("package.json")),
    );
  } catch {
    return err("github_error", "리포 내용을 읽지 못했습니다.");
  }

  const { data, error } = await insertProject({
    userId: user.id,
    installationId: null,
    repoFullName: fullName,
    defaultBranch: refs.head!.branch,
    detectedStack,
  });
  if (error) return err("db_error", "프로젝트를 저장하지 못했습니다.");
  return ok({ projectId: data.id });
}

/** 내 프로젝트인지 RLS 로 확인한 뒤 지운다. */
export async function deleteProject(projectId: string): Promise<Result<null>> {
  const { data } = await getMyProject(projectId);
  if (!data) return err("not_found", "프로젝트를 찾을 수 없습니다.");
  const { error } = await deleteProjectRow(projectId);
  return error ? err("db_error", "프로젝트를 지우지 못했습니다.") : ok(null);
}
