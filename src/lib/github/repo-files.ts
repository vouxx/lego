import "server-only";
import {
  isDependencyFile,
  isEnvTemplate,
  isJsFile,
  isSqlFile,
  type ScanInput,
} from "@lego/scanner";
import { installationOctokit } from "./app";

const SKIP_DIRS =
  /(^|\/)(node_modules|\.next|\.nuxt|\.svelte-kit|\.vercel|\.turbo|dist|build|out|coverage|vendor|\.git)\//;
const MAX_FILE_BYTES = 200_000;
// lockfile 은 크기가 커서 따로 한도를 둔다(SEC-014).
const MAX_LOCKFILE_BYTES = 5_000_000;
const MAX_FILES = 800;
const CONCURRENCY = 8;

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

export type RepoSnapshot = ScanInput & {
  /** 파일이 너무 많아 일부만 읽었거나 GitHub 트리가 잘렸는지 */
  truncated: boolean;
};

export async function latestCommitSha(
  installationId: number,
  repoFullName: string,
  branch: string,
) {
  const octokit = await installationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/") as [string, string];
  const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  return data.commit.sha;
}

/** 특정 커밋의 파일 트리와 검사 대상 파일 내용을 읽는다. */
export async function readRepoAtCommit(
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
  const blobs = tree.tree.filter((e) => e.type === "blob" && e.path);
  const paths = blobs.map((e) => e.path!);
  // 파일 수 한도에 걸려도 의존성 파일은 빠지지 않게 앞에 둔다.
  const targets = blobs
    .filter((e) => shouldRead(e.path!, e.size))
    .sort(
      (a, b) =>
        Number(isDependencyFile(b.path!)) - Number(isDependencyFile(a.path!)),
    );
  const selected = targets.slice(0, MAX_FILES);

  const files: ScanInput["files"] = [];
  for (let i = 0; i < selected.length; i += CONCURRENCY) {
    const batch = selected.slice(i, i + CONCURRENCY);
    const contents = await Promise.all(
      batch.map(async (entry) => {
        const { data } = await octokit.rest.git.getBlob({
          owner,
          repo,
          file_sha: entry.sha!,
        });
        return {
          path: entry.path!,
          content: Buffer.from(data.content, "base64").toString("utf8"),
        };
      }),
    );
    files.push(...contents);
  }

  return {
    files,
    paths,
    truncated: tree.truncated || targets.length > selected.length,
  };
}
