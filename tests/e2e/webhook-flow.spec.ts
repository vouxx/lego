import { createHmac, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * 로컬 Supabase 전용: GitHub 이 보내는 push webhook 을 같은 비밀값으로 서명해 직접 보낸다.
 * [T-n] 커밋 → 스펙 작업 자동 완료, package.json 변경 → 규칙 파일 '업데이트 필요'를 확인한다.
 * GitHub App 에 Push 이벤트를 켜기 전에도 서버 쪽 흐름을 끝까지 검증할 수 있다.
 */
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost)/.test(url);
test.skip(!isLocal, "로컬 Supabase 에서만 돈다");

const INSTALLATION = 990_001;
const REPO = "e2e/webhook-repo";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY ?? "", {
  auth: { persistSession: false },
}).schema("lego");

let ids: { project: string; spec: string; contextFile: string };

const sha = () => randomBytes(20).toString("hex");

async function sendPush(
  request: APIRequestContext,
  event: {
    ref?: string;
    commits: { message: string; modified?: string[]; id?: string }[];
  },
  secret = process.env.GITHUB_WEBHOOK_SECRET ?? "",
) {
  const body = JSON.stringify({
    ref: event.ref ?? "refs/heads/main",
    repository: { full_name: REPO, default_branch: "main" },
    installation: { id: INSTALLATION },
    commits: event.commits.map((c) => ({
      id: c.id ?? sha(),
      message: c.message,
      added: [],
      removed: [],
      modified: c.modified ?? [],
    })),
  });
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  return request.post("/api/github/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "push",
      "x-hub-signature-256": signature,
    },
  });
}

const taskStatus = async () => {
  const { data } = await admin
    .from("spec_tasks")
    .select("key, status, done_commit")
    .eq("spec_id", ids.spec)
    .order("seq");
  return data ?? [];
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("github_login", "lego-e2e")
    .single();
  if (!profile) throw new Error("pnpm e2e:local-seed 를 먼저 실행하세요.");
  await admin.from("projects").delete().eq("repo_full_name", REPO);
  await admin.from("github_installations").upsert(
    {
      user_id: profile.id,
      installation_id: INSTALLATION,
      account_login: "e2e",
    },
    { onConflict: "installation_id" },
  );

  const { data: project } = await admin
    .from("projects")
    .insert({
      user_id: profile.id,
      installation_id: INSTALLATION,
      repo_full_name: REPO,
      default_branch: "main",
      detected_stack: { tags: [], packageManager: null, versions: {} },
    })
    .select("id")
    .single();
  const { data: spec } = await admin
    .from("specs")
    .insert({
      user_id: profile.id,
      project_id: project!.id,
      idea: "webhook 테스트용 스펙",
      title: "Webhook 테스트 스펙",
      status: "ready",
    })
    .select("id")
    .single();
  await admin.from("spec_tasks").insert(
    ["로그인 화면", "프로필 저장", "알림 설정"].map((title, i) => ({
      spec_id: spec!.id,
      user_id: profile.id,
      key: `T-${i + 1}`,
      seq: i + 1,
      title,
      depends_on: i === 0 ? [] : [`T-${i}`],
    })),
  );
  const { data: contextFile } = await admin
    .from("context_files")
    .insert({
      project_id: project!.id,
      user_id: profile.id,
      target: "claude_md",
      analyzed_commit: sha(),
      analysis: {
        stack: { tags: [], packageManager: null, versions: {} },
        rootEntries: ["src", "package.json"],
        commands: [],
        folders: [],
        cautions: [],
      },
    })
    .select("id")
    .single();
  ids = {
    project: project!.id,
    spec: spec!.id,
    contextFile: contextFile!.id,
  };
});

test.afterAll(async () => {
  if (!ids) return;
  await admin.from("specs").delete().eq("id", ids.spec);
  await admin.from("projects").delete().eq("id", ids.project);
  await admin
    .from("github_installations")
    .delete()
    .eq("installation_id", INSTALLATION);
});

test("서명이 틀리거나 기본 브랜치가 아니면 아무것도 바꾸지 않는다", async ({
  request,
}) => {
  const forged = await sendPush(
    request,
    { commits: [{ message: "[T-1] 위조" }] },
    "wrong-secret",
  );
  expect(forged.status()).toBe(401);

  const branch = await sendPush(request, {
    ref: "refs/heads/feature/login",
    commits: [{ message: "[T-1] 브랜치 작업", modified: ["package.json"] }],
  });
  expect(branch.status()).toBe(200);
  expect(await branch.json()).toEqual({ handled: false });
  expect((await taskStatus()).map((t) => t.status)).toEqual([
    "todo",
    "todo",
    "todo",
  ]);
});

test("기본 브랜치의 [T-n] 커밋으로 작업이 완료되고 보드에 보인다", async ({
  request,
  page,
}) => {
  const commit = sha();
  const res = await sendPush(request, {
    commits: [
      { id: commit, message: "feat: 로그인 화면 [T-1] (#3)" },
      { message: "chore: 의존성 추가", modified: ["package.json"] },
    ],
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ handled: true });

  const tasks = await taskStatus();
  expect(tasks.map((t) => [t.key, t.status])).toEqual([
    ["T-1", "done"],
    ["T-2", "todo"],
    ["T-3", "todo"],
  ]);
  expect(tasks[0]!.done_commit).toBe(commit);

  const { data: file } = await admin
    .from("context_files")
    .select("outdated")
    .eq("id", ids.contextFile)
    .single();
  expect(file!.outdated).toBe(true);

  // 같은 이벤트가 다시 와도(GitHub 재전송) 그대로다.
  const again = await sendPush(request, {
    commits: [{ id: commit, message: "feat: 로그인 화면 [T-1] (#3)" }],
  });
  expect(await again.json()).toEqual({ handled: false });

  await page.goto(`/specs/${ids.spec}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /작업/ }).click();
  await expect(
    page.getByText(`커밋 ${commit.slice(0, 7)} 으로 완료`),
  ).toBeVisible();
});

test("한 push 에 여러 작업 키가 있으면 모두 완료한다", async ({ request }) => {
  const res = await sendPush(request, {
    commits: [{ message: "[T-2][T-3] 프로필 저장과 알림 설정" }],
  });
  expect(await res.json()).toEqual({ handled: true });
  expect((await taskStatus()).map((t) => t.status)).toEqual([
    "done",
    "done",
    "done",
  ]);
});

async function sendPullRequest(
  request: APIRequestContext,
  pr: {
    action: string;
    number: number;
    title: string;
    branch: string;
    merged?: boolean;
    mergeSha?: string;
  },
) {
  const body = JSON.stringify({
    action: pr.action,
    installation: { id: INSTALLATION },
    repository: { full_name: REPO },
    pull_request: {
      number: pr.number,
      title: pr.title,
      html_url: `https://github.com/${REPO}/pull/${pr.number}`,
      draft: false,
      merged: pr.merged ?? false,
      merge_commit_sha: pr.mergeSha ?? null,
      head: { sha: sha(), ref: pr.branch },
    },
  });
  const signature = `sha256=${createHmac(
    "sha256",
    process.env.GITHUB_WEBHOOK_SECRET ?? "",
  )
    .update(body)
    .digest("hex")}`;
  return request.post("/api/github/webhook", {
    data: body,
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request",
      "x-hub-signature-256": signature,
    },
  });
}

test("PR 제목·브랜치의 작업 키로 PR 을 잇고, 머지되면 작업을 완료한다", async ({
  request,
  page,
}) => {
  await admin
    .from("spec_tasks")
    .update({ status: "todo", done_commit: null })
    .eq("spec_id", ids.spec)
    .in("key", ["T-2", "T-3"]);
  expect(
    (
      await sendPullRequest(request, {
        action: "opened",
        number: 21,
        title: "[T-2] 프로필 저장",
        branch: "feature/profile",
      })
    ).status(),
  ).toBe(200);
  // 제목에 키가 없어도 브랜치 이름(t-3)으로 잇는다.
  await sendPullRequest(request, {
    action: "opened",
    number: 22,
    title: "알림 설정 화면",
    branch: "feat/t-3-alarm",
  });
  const links = async () =>
    (
      await admin
        .from("spec_task_prs")
        .select("pr_number, state, spec_tasks!inner(key, spec_id)")
        .eq("spec_tasks.spec_id", ids.spec)
        .order("pr_number")
    ).data ?? [];
  expect(
    (await links()).map((l) => [
      (l.spec_tasks as unknown as { key: string }).key,
      l.pr_number,
      l.state,
    ]),
  ).toEqual([
    ["T-2", 21, "open"],
    ["T-3", 22, "open"],
  ]);

  await page.goto(`/specs/${ids.spec}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /작업/ }).click();
  const t2 = page.getByRole("list", { name: "T-2 PR" });
  await expect(t2).toContainText("PR #21");
  await expect(t2).toContainText("열림");

  // 머지 → 작업 완료(머지 커밋), 닫힘(머지 안 됨) → 작업은 그대로
  const mergeSha = sha();
  await sendPullRequest(request, {
    action: "closed",
    number: 21,
    title: "[T-2] 프로필 저장",
    branch: "feature/profile",
    merged: true,
    mergeSha,
  });
  await sendPullRequest(request, {
    action: "closed",
    number: 22,
    title: "알림 설정 화면",
    branch: "feat/t-3-alarm",
  });
  const tasks = await taskStatus();
  expect(tasks.find((t) => t.key === "T-2")).toMatchObject({
    status: "done",
    done_commit: mergeSha,
  });
  expect(tasks.find((t) => t.key === "T-3")?.status).toBe("todo");
  expect((await links()).map((l) => l.state)).toEqual(["merged", "closed"]);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /작업/ }).click();
  await expect(page.getByRole("list", { name: "T-2 PR" })).toContainText(
    "머지됨",
  );
  await expect(
    page.getByText(`커밋 ${mergeSha.slice(0, 7)} 으로 완료`),
  ).toBeVisible();
});
