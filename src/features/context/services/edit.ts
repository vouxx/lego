import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { getInstallationAccess } from "@/lib/github/app";
import { openFilePullRequest } from "@/lib/github/pull-request";
import { reportError } from "@/lib/monitoring";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  deleteCustomRule,
  getMyContextFile,
  getVersionContents,
  insertContextVersion,
  insertCustomRule,
  setCustomRuleEnabled,
  setPackRuleEnabled,
  setVersionPrUrl,
} from "../repository";
import {
  TARGET_INFO,
  type ContextTarget,
  type PrAvailability,
} from "../schemas";
import { renderForFile } from "./rules";

/** RLS 로 읽히면 본인 소유다. 없으면 남의 것이거나 없는 id. */
async function ownedFile(contextFileId: string) {
  const { data } = await getMyContextFile(contextFileId);
  return data;
}

const NOT_FOUND = err("not_found", "규칙 파일을 찾을 수 없습니다.");

export async function toggleRule(
  user: CurrentUser,
  input: {
    contextFileId: string;
    itemId: string;
    custom: boolean;
    enabled: boolean;
  },
): Promise<Result<{ content: string }>> {
  const file = await ownedFile(input.contextFileId);
  if (!file) return NOT_FOUND;

  const { error } = input.custom
    ? await setCustomRuleEnabled(file.id, input.itemId, input.enabled)
    : await setPackRuleEnabled({
        contextFileId: file.id,
        userId: user.id,
        itemId: input.itemId,
        enabled: input.enabled,
      });
  if (error) return err("db_error", "규칙을 바꾸지 못했습니다.");

  const rendered = await renderForFile(file);
  return rendered.ok ? ok({ content: rendered.data.content }) : rendered;
}

export async function addCustomRule(
  user: CurrentUser,
  input: { contextFileId: string; section: string; content: string },
): Promise<Result<{ content: string }>> {
  const file = await ownedFile(input.contextFileId);
  if (!file) return NOT_FOUND;

  const { error } = await insertCustomRule({
    contextFileId: file.id,
    userId: user.id,
    section: input.section,
    content: input.content,
  });
  if (error) return err("db_error", "규칙을 추가하지 못했습니다.");

  const rendered = await renderForFile(file);
  return rendered.ok ? ok({ content: rendered.data.content }) : rendered;
}

export async function removeCustomRule(input: {
  contextFileId: string;
  ruleId: string;
}): Promise<Result<{ content: string }>> {
  const file = await ownedFile(input.contextFileId);
  if (!file) return NOT_FOUND;

  const { error } = await deleteCustomRule(file.id, input.ruleId);
  if (error) return err("db_error", "규칙을 지우지 못했습니다.");

  const rendered = await renderForFile(file);
  return rendered.ok ? ok({ content: rendered.data.content }) : rendered;
}

/** 편집한 내용을 새 버전으로 저장한다. 규칙 조합 그대로면 generated, 손으로 고쳤으면 edited. */
export async function saveContextVersion(
  user: CurrentUser,
  input: { contextFileId: string; content: string },
): Promise<Result<{ versionId: string }>> {
  const file = await ownedFile(input.contextFileId);
  if (!file) return NOT_FOUND;

  if (file.current_version_id) {
    const { data } = await getVersionContents([file.current_version_id]);
    if (data?.[0]?.content === input.content) {
      return ok({ versionId: file.current_version_id });
    }
  }

  const rendered = await renderForFile(file);
  const version = await insertContextVersion({
    contextFileId: file.id,
    userId: user.id,
    content: input.content,
    source:
      rendered.ok && rendered.data.content === input.content
        ? "generated"
        : "edited",
    basedOnCommit: file.analyzed_commit,
  });
  if (version.error || !version.data) {
    return err("db_error", "버전을 저장하지 못했습니다.");
  }
  return ok({ versionId: version.data.id });
}

/** PR 을 만들 수 있는지. 공개 리포(App 연결 없음)나 쓰기 권한을 승인하지 않은 설치는 내려받기만 된다. */
export async function prAvailability(
  installationId: number | null,
): Promise<PrAvailability> {
  if (installationId === null) return { status: "public_repo" };
  try {
    const { permissions, settingsUrl } =
      await getInstallationAccess(installationId);
    return permissions.contents === "write" &&
      permissions.pull_requests === "write"
      ? { status: "ready" }
      : { status: "needs_permission", settingsUrl };
  } catch (error) {
    reportError(error, {
      area: "context.pr_availability",
      extra: { installationId },
    });
    return { status: "unknown" };
  }
}

function branchName(target: ContextTarget) {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `lego/context-${target.replace("_", "-")}-${stamp}`;
}

/** 현재 버전을 새 브랜치에 커밋하고 PR 을 연다. */
export async function openContextPr(
  contextFileId: string,
): Promise<Result<{ prUrl: string }>> {
  const file = await ownedFile(contextFileId);
  if (!file?.projects) return NOT_FOUND;
  if (!file.current_version_id) {
    return err("no_version", "저장된 버전이 없습니다. 먼저 저장해 주세요.");
  }

  const installationId = file.projects.installation_id;
  const availability = await prAvailability(installationId);
  if (availability.status === "public_repo" || installationId === null) {
    return err(
      "public_repo",
      "주소로 등록한 공개 리포는 PR 을 만들 수 없습니다. 내려받아 리포에 추가해 주세요.",
    );
  }
  if (availability.status === "needs_permission") {
    return err(
      "needs_permission",
      "PR 을 만들려면 GitHub 에서 레고의 쓰기 권한을 승인해야 합니다.",
    );
  }

  const { data: versions } = await getVersionContents([
    file.current_version_id,
  ]);
  const content = versions?.[0]?.content;
  if (content === undefined)
    return err("no_version", "저장된 버전이 없습니다.");

  const target = file.target as ContextTarget;
  const path = TARGET_INFO[target].path;
  try {
    const prUrl = await openFilePullRequest({
      installationId,
      repoFullName: file.projects.repo_full_name,
      baseBranch: file.projects.default_branch,
      branch: branchName(target),
      path,
      content,
      commitMessage: `docs: ${path} 추가 (레고 컨텍스트 생성기)`,
      title: `${path} 추가/업데이트`,
      body: [
        `레고(Lego)가 이 리포의 기술 스택과 폴더 구조를 분석해 만든 ${TARGET_INFO[target].tool} 용 규칙 파일입니다.`,
        "",
        "- AI 코딩 도구가 작업 전에 읽고 이 프로젝트의 구조와 규칙을 따릅니다.",
        "- 내용은 레고 화면에서 고친 뒤 다시 PR 을 만들 수 있습니다.",
      ].join("\n"),
    });
    await setVersionPrUrl(file.current_version_id, prUrl);
    return ok({ prUrl });
  } catch (error) {
    reportError(error, { area: "context.open_pr", extra: { contextFileId } });
    return err("github_error", "GitHub 에 PR 을 만들지 못했습니다.");
  }
}
