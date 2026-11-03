import "server-only";
import { installationOctokit } from "./app";

/**
 * 기본 브랜치에서 새 브랜치를 만들고 파일 하나를 커밋한 뒤 PR 을 연다.
 * 파일이 이미 있으면 덮어쓴다. PR 주소를 돌려준다.
 */
export async function openFilePullRequest(params: {
  installationId: number;
  repoFullName: string;
  baseBranch: string;
  branch: string;
  path: string;
  content: string;
  commitMessage: string;
  title: string;
  body: string;
}) {
  const octokit = await installationOctokit(params.installationId);
  const [owner, repo] = params.repoFullName.split("/") as [string, string];

  const { data: base } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${params.baseBranch}`,
  });
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${params.branch}`,
    sha: base.object.sha,
  });

  let existingSha: string | undefined;
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: params.path,
      ref: params.branch,
    });
    if (!Array.isArray(data) && data.type === "file") existingSha = data.sha;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: params.path,
    branch: params.branch,
    message: params.commitMessage,
    content: Buffer.from(params.content, "utf8").toString("base64"),
    sha: existingSha,
  });

  const { data: pr } = await octokit.rest.pulls.create({
    owner,
    repo,
    head: params.branch,
    base: params.baseBranch,
    title: params.title,
    body: params.body,
  });
  return pr.html_url;
}

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}
