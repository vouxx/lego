import "server-only";
import { gunzipSync } from "node:zlib";
import {
  isDependencyFile,
  isEnvTemplate,
  isJsFile,
  isSqlFile,
  type ScanInput,
} from "@lego/scanner";
import { installationOctokit } from "./app";
import { parseGitRefs, readTar } from "./archive";

const SKIP_DIRS =
  /(^|\/)(node_modules|\.next|\.nuxt|\.svelte-kit|\.vercel|\.turbo|dist|build|out|coverage|vendor|\.git)\//;
const MAX_FILE_BYTES = 200_000;
// lockfile 은 크기가 커서 따로 한도를 둔다(SEC-014).
const MAX_LOCKFILE_BYTES = 5_000_000;
const MAX_FILES = 800;
const CONCURRENCY = 8;
// 공개 리포 tarball 한도(압축 / 압축 해제)
const MAX_TARBALL_BYTES = 100_000_000;
const MAX_UNPACKED_BYTES = 400_000_000;
const USER_AGENT = "lego-security-scanner";

/**
 * 리포를 읽는 방법. installationId 가 있으면 GitHub App 설치 토큰(비공개 리포 포함),
 * null 이면 공개 리포로 보고 GitHub API 없이 git refs 와 codeload tarball 로 읽는다.
 */
export type RepoAccess = { installationId: number | null };

// 내용을 읽을 파일. .env 는 경로만 보고(SEC-002) 내용은 읽지 않는다.
function shouldRead(path: string, size: number | undefined) {
  if (SKIP_DIRS.test(path)) return false;
  if (isDependencyFile(path)) return (size ?? 0) <= MAX_LOCKFILE_BYTES;
  if ((size ?? 0) > MAX_FILE_BYTES) return false;
  if (/\.min\.[cm]?js$/.test(path) || path.endsWith(".d.ts")) return false;
  return (
    isJsFile(path) ||
    isSqlFile(path) ||
    isEnvTemplate(path) ||
    path === ".gitignore"
  );
}

/** 읽을 파일을 고른다. 파일 수 한도에 걸려도 의존성 파일은 빠지지 않게 앞에 둔다. */
function selectTargets<T extends { path: string; size?: number }>(
  entries: T[],
) {
  const targets = entries
    .filter((e) => shouldRead(e.path, e.size))
    .sort(
      (a, b) =>
        Number(isDependencyFile(b.path)) - Number(isDependencyFile(a.path)),
    );
  const selected = targets.slice(0, MAX_FILES);
  return { selected, cut: targets.length > selected.length };
}

export type RepoSnapshot = ScanInput & {
  /** 파일이 너무 많아 일부만 읽었거나 GitHub 트리가 잘렸는지 */
  truncated: boolean;
};

export class PublicRepoNotFoundError extends Error {
  constructor(repoFullName: string) {
    super(`공개 리포를 찾을 수 없습니다: ${repoFullName}`);
  }
}

/** 공개 리포의 기본 브랜치와 브랜치별 커밋. 없거나 비공개면 PublicRepoNotFoundError. */
export async function publicRepoRefs(repoFullName: string) {
  const res = await fetch(
    `https://github.com/${repoFullName}.git/info/refs?service=git-upload-pack`,
    { headers: { "user-agent": USER_AGENT }, cache: "no-store" },
  );
  // 비공개이거나 없는 리포는 401/404 로 인증을 요구한다.
  if (res.status === 401 || res.status === 404)
    throw new PublicRepoNotFoundError(repoFullName);
  if (!res.ok) throw new Error(`GitHub refs ${res.status}`);
  const refs = parseGitRefs(await res.text());
  if (!refs.head) throw new PublicRepoNotFoundError(repoFullName);
  return refs;
}

export async function latestCommitSha(
  { installationId }: RepoAccess,
  repoFullName: string,
  branch: string,
) {
  if (installationId === null) {
    const refs = await publicRepoRefs(repoFullName);
    const sha = refs.branches.get(branch) ?? refs.head?.sha;
    if (!sha) throw new PublicRepoNotFoundError(repoFullName);
    return sha;
  }
  const octokit = await installationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/") as [string, string];
  const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

/** 특정 커밋의 파일 트리와 검사 대상 파일 내용을 읽는다. */
export async function readRepoAtCommit(
  access: RepoAccess,
  repoFullName: string,
  sha: string,
): Promise<RepoSnapshot> {
  return access.installationId === null
    ? readPublicRepoAtCommit(repoFullName, sha)
    : readInstalledRepoAtCommit(access.installationId, repoFullName, sha);
}

async function readInstalledRepoAtCommit(
  installationId: number,
  repoFullName: string,
  sha: string,
): Promise<RepoSnapshot> {
  const octokit = await installationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/") as [string, string];

  const { data: tree } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: "true",
  });
  const blobs = tree.tree
    .filter((e) => e.type === "blob" && e.path)
    .map((e) => ({ path: e.path!, size: e.size, sha: e.sha! }));
  const { selected, cut } = selectTargets(blobs);

  const files: ScanInput["files"] = [];
  for (let i = 0; i < selected.length; i += CONCURRENCY) {
    const batch = selected.slice(i, i + CONCURRENCY);
    const contents = await Promise.all(
      batch.map(async (entry) => {
        const { data } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: entry.sha,
        });
        return {
          path: entry.path,
          content: Buffer.from(data.content, "base64").toString("utf8"),
        };
      }),
    );
    files.push(...contents);
  }

  return {
    files,
    paths: blobs.map((b) => b.path),
    truncated: tree.truncated || cut,
  };
}

async function readPublicRepoAtCommit(
  repoFullName: string,
  sha: string,
): Promise<RepoSnapshot> {
  const res = await fetch(
    `https://codeload.github.com/${repoFullName}/tar.gz/${sha}`,
    { headers: { "user-agent": USER_AGENT }, cache: "no-store" },
  );
  if (res.status === 404) throw new PublicRepoNotFoundError(repoFullName);
  if (!res.ok) throw new Error(`GitHub codeload ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_TARBALL_BYTES)
    throw new Error("리포가 너무 커서 읽을 수 없습니다.");
  const gz = Buffer.from(await res.arrayBuffer());
  if (gz.length > MAX_TARBALL_BYTES)
    throw new Error("리포가 너무 커서 읽을 수 없습니다.");

  // tarball 의 모든 경로는 "<repo>-<sha>/" 로 시작한다.
  const entries = [
    ...readTar(gunzipSync(gz, { maxOutputLength: MAX_UNPACKED_BYTES })),
  ]
    .map((f) => ({ ...f, path: f.path.slice(f.path.indexOf("/") + 1) }))
    .filter((f) => f.path);
  const { selected, cut } = selectTargets(entries);

  return {
    files: selected.map((f) => ({
      path: f.path,
      content: f.content.toString("utf8"),
    })),
    paths: entries.map((e) => e.path),
    truncated: cut,
  };
}
