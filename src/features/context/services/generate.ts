import "server-only";
import type { CurrentUser } from "@/lib/auth";
import {
  latestCommitSha,
  readRepoAtCommit,
  type RepoAccess,
} from "@/lib/github/repo-files";
import type { LlmUsage } from "@/lib/llm";
import { reportError } from "@/lib/monitoring";
import { err, ok, type Result } from "@/shared/lib/result";
import { detectRepoStack, topLevelEntries } from "@/shared/stack/detect";
import {
  addTokenUsage,
  ensureContextRules,
  findLatestSpecOverview,
  findMyContextFile,
  findMyProject,
  getVersionContents,
  insertContextVersion,
  insertLlmCall,
  listOpenFindings,
  upsertContextFile,
} from "../repository";
import {
  contextAnalysisSchema,
  type ContextAnalysis,
  type ContextTarget,
} from "../schemas";
import {
  buildCautions,
  extractCommands,
  pickFolders,
  pickRepresentativeFiles,
} from "./analyze";
import { selectPacks } from "@/shared/context/packs";
import { stackText } from "@/shared/context/render";
import { loadRulePacks, renderForFile } from "./rules";
import { summarizeFolders } from "./summarize";

type BaseAnalysis = Omit<ContextAnalysis, "cautions">;

function parsePackageJson(content: string | undefined) {
  if (!content) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

/** 리포를 읽어 스택·명령어·폴더 요약을 만든다. 폴더 요약에만 LLM(Haiku)을 쓴다. */
export async function analyzeRepo(
  access: RepoAccess,
  repoFullName: string,
  sha: string,
  onUsage: (usage: LlmUsage) => Promise<void>,
): Promise<BaseAnalysis> {
  const snapshot = await readRepoAtCommit(access, repoFullName, sha);
  const packageJson = parsePackageJson(
    snapshot.files.find((f) => f.path === "package.json")?.content,
  );
  const entries = topLevelEntries(snapshot.paths);
  // 모노레포(apps/web 등)도 보도록 워크스페이스 package.json 을 모두 본다.
  const stack = detectRepoStack(
    snapshot.paths,
    snapshot.files.filter((f) => f.path.endsWith("package.json")),
  );

  const folders = pickFolders(snapshot.paths).map((f) => ({
    ...f,
    samples: pickRepresentativeFiles(f.path, snapshot.files),
  }));
  const summaries = await summarizeFolders(folders, stackText(stack), onUsage);

  return {
    stack,
    rootEntries: entries.rootEntries,
    commands: extractCommands(packageJson, stack.packageManager),
    folders: folders.map((f) => ({
      path: f.path,
      summary: summaries.get(f.path) ?? "",
    })),
  };
}

async function loadCautions(projectId: string) {
  const { data, error } = await listOpenFindings(projectId);
  if (error) return [];
  return buildCautions(
    data.map((f) => ({
      ruleId: f.rule_id,
      title: f.rules?.title ?? f.rule_id,
      filePath: f.file_path,
    })),
  );
}

/**
 * 감지 → 규칙 팩 조합 → 구조 요약 → 초안 버전 저장.
 * 같은 커밋을 이미 분석했으면 LLM 을 다시 부르지 않고, 주의할 점(발견 항목)과 스펙 개요만 새로 반영한다.
 */
export async function generateContext(
  user: CurrentUser,
  projectId: string,
  target: ContextTarget,
): Promise<Result<{ contextFileId: string }>> {
  const { data: project } = await findMyProject(projectId);
  if (!project) return err("not_found", "프로젝트를 찾을 수 없습니다.");

  const { data: hasQuota } = await addTokenUsage(user.id, 0);
  if (hasQuota === false) {
    return err("quota_exceeded", "이번 달 AI 사용 한도를 모두 썼습니다.");
  }

  const access = { installationId: project.installation_id };
  const usages: LlmUsage[] = [];
  let sha: string;
  let base: BaseAnalysis;
  const { data: existing } = await findMyContextFile(projectId, target);
  try {
    sha = await latestCommitSha(
      access,
      project.repo_full_name,
      project.default_branch,
    );
    const cached =
      existing?.analyzed_commit === sha
        ? contextAnalysisSchema.safeParse(existing.analysis)
        : null;
    base = cached?.success
      ? cached.data
      : await analyzeRepo(access, project.repo_full_name, sha, async (u) => {
          usages.push(u);
        });
  } catch (error) {
    reportError(error, { area: "context.analyze", extra: { projectId } });
    return err("github_error", "GitHub 에서 리포를 읽지 못했습니다.");
  }

  const [cautions, { data: spec }] = await Promise.all([
    loadCautions(projectId),
    findLatestSpecOverview(projectId),
  ]);
  const analysis: ContextAnalysis = {
    ...base,
    overview: spec?.overview ?? undefined,
    cautions,
  };
  const saved = await upsertContextFile({
    projectId,
    userId: user.id,
    target,
    analysis,
    analyzedCommit: sha,
  });
  if (saved.error) return err("db_error", "규칙 파일을 저장하지 못했습니다.");
  const contextFileId = saved.data.id;

  for (const usage of usages) {
    await insertLlmCall({
      user_id: user.id,
      context_file_id: contextFileId,
      purpose: "context_summary",
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
      latency_ms: usage.latencyMs,
    });
    await addTokenUsage(user.id, usage.inputTokens + usage.outputTokens);
  }

  const packs = await loadRulePacks();
  if (!packs.ok) return packs;
  const { error: rulesError } = await ensureContextRules(
    selectPacks(packs.data, analysis.stack.tags).flatMap((pack) =>
      pack.items.map((item) => ({
        context_file_id: contextFileId,
        user_id: user.id,
        item_id: item.id,
        enabled: item.defaultEnabled,
      })),
    ),
  );
  if (rulesError) return err("db_error", "규칙 설정을 저장하지 못했습니다.");

  const rendered = await renderForFile({
    id: contextFileId,
    target,
    analysis,
  });
  if (!rendered.ok) return rendered;

  // 내용이 그대로면 버전을 새로 만들지 않는다.
  if (existing?.current_version_id) {
    const { data: current } = await getVersionContents([
      existing.current_version_id,
    ]);
    if (current?.[0]?.content === rendered.data.content) {
      return ok({ contextFileId });
    }
  }
  const version = await insertContextVersion({
    contextFileId,
    userId: user.id,
    content: rendered.data.content,
    source: "generated",
    basedOnCommit: sha,
  });
  if (version.error) return err("db_error", "초안을 저장하지 못했습니다.");
  return ok({ contextFileId });
}
