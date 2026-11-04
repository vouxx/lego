import "server-only";
import { installationOctokit } from "./app";

const MAX_FILES = 300;
const MAX_CONTENT_BYTES = 200_000;

type Repo = { owner: string; repo: string };

const splitRepo = (fullName: string): Repo => {
  const [owner, repo] = fullName.split("/");
  return { owner: owner!, repo: repo! };
};

export type PullFile = {
  path: string;
  status: string;
  patch?: string;
};

/** PR 의 바뀐 파일과 patch. GitHub 는 큰 파일의 patch 를 주지 않는다. */
export async function listPullFiles(
  installationId: number,
  repoFullName: string,
  pullNumber: number,
): Promise<PullFile[]> {
  const octokit = await installationOctokit(installationId);
  const files: PullFile[] = [];
  for (let page = 1; files.length < MAX_FILES; page++) {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}/files",
      {
        ...splitRepo(repoFullName),
        pull_number: pullNumber,
        per_page: 100,
        page,
      },
    );
    files.push(
      ...data.map((f) => ({
        path: f.filename,
        status: f.status,
        patch: f.patch,
      })),
    );
    if (data.length < 100) break;
  }
  return files.slice(0, MAX_FILES);
}

/** 커밋 기준 파일 내용. 없거나(404) 너무 크면 null. */
export async function readFileAtRef(
  installationId: number,
  repoFullName: string,
  path: string,
  ref: string,
): Promise<string | null> {
  const octokit = await installationOctokit(installationId);
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { ...splitRepo(repoFullName), path, ref },
    );
    if (Array.isArray(data) || data.type !== "file" || !("content" in data))
      return null;
    if (data.size > MAX_CONTENT_BYTES) return null;
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}

export type CheckAnnotation = {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: "notice" | "warning" | "failure";
  title: string;
  message: string;
};

export async function createCheckRun(
  installationId: number,
  repoFullName: string,
  headSha: string,
  name: string,
) {
  const octokit = await installationOctokit(installationId);
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/check-runs",
    {
      ...splitRepo(repoFullName),
      name,
      head_sha: headSha,
      status: "in_progress",
    },
  );
  return Number(data.id);
}

export async function completeCheckRun(
  installationId: number,
  repoFullName: string,
  checkRunId: number,
  result: {
    conclusion: "success" | "neutral" | "failure";
    title: string;
    summary: string;
    detailsUrl?: string;
    annotations: CheckAnnotation[];
  },
) {
  const octokit = await installationOctokit(installationId);
  await octokit.request(
    "PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}",
    {
      ...splitRepo(repoFullName),
      check_run_id: checkRunId,
      status: "completed",
      conclusion: result.conclusion,
      details_url: result.detailsUrl,
      // GitHub 는 한 번에 annotation 50개까지 받는다.
      output: {
        title: result.title,
        summary: result.summary,
        annotations: result.annotations.slice(0, 50),
      },
    },
  );
}

/** 줄 코멘트를 묶은 리뷰 하나(COMMENT). 승인·변경 요청은 하지 않는다. */
export async function createPullReview(
  installationId: number,
  repoFullName: string,
  pullNumber: number,
  review: {
    commitId: string;
    body: string;
    comments: { path: string; line: number; body: string }[];
  },
) {
  const octokit = await installationOctokit(installationId);
  const { data } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews",
    {
      ...splitRepo(repoFullName),
      pull_number: pullNumber,
      commit_id: review.commitId,
      event: "COMMENT",
      body: review.body,
      comments: review.comments.map((c) => ({ ...c, side: "RIGHT" as const })),
    },
  );
  return Number(data.id);
}
