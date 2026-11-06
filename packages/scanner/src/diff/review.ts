import { isEnvFile, isEnvTemplate } from "../files";
import { STATIC_RULES } from "../rules";
import { findSecrets } from "../secrets";
import type { Candidate, Rule } from "../types";
import { parsePatch, touchesAdded } from "./patch";
import { PR_RULES, type ChangedFile, type PrInput } from "./rules";

// 리포 전체를 봐야 하는 규칙은 바뀐 파일만으로는 판단할 수 없어 PR 에서는 돌리지 않는다.
const REPO_WIDE = new Set(["SEC-002", "SEC-016"]);

/** .env.example 같은 템플릿에서 환경 변수 이름을 꺼낸다. */
export function envNames(templates: string[]) {
  const names = new Set<string>();
  for (const t of templates)
    for (const m of t.matchAll(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/gm))
      names.add(m[1]!);
  return names;
}

/**
 * PR 하나를 점검한다. 보안 규칙은 바뀐 파일의 최신 내용 전체로 돌리고, 추가된 줄에 걸친 후보만 남긴다.
 * PR 규칙(PR-001~005)은 diff 자체를 본다.
 */
export function reviewPullRequest(
  files: ChangedFile[],
  envTemplates: string[] | null,
  rules: Rule[] = STATIC_RULES,
) {
  const present = files.filter(
    (f) => f.status !== "removed" && f.content !== undefined,
  );
  const added = new Map(
    present.map((f) => [f.path, parsePatch(f.patch).added]),
  );
  const sourceFiles = present.map((f) => ({
    path: f.path,
    content: f.content!,
  }));
  const errors: { ruleId: string; message: string }[] = [];
  const candidates: Candidate[] = [];

  for (const rule of rules) {
    if (REPO_WIDE.has(rule.id)) continue;
    try {
      for (const c of rule.detect({
        files: sourceFiles,
        paths: sourceFiles.map((f) => f.path),
      })) {
        const lines = added.get(c.filePath);
        // 새로 만든 파일은 전체가 추가된 줄이다. patch 가 없는(큰) 파일은 판단할 수 없어 뺀다.
        if (lines && touchesAdded(c, lines)) candidates.push(c);
      }
    } catch (error) {
      errors.push({
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const file of files) {
    if (file.status === "removed") continue;
    // .env 내용은 읽지 않는다. 파일이 PR 에 들어왔다는 것만으로 문제다.
    if (isEnvFile(file.path) && !isEnvTemplate(file.path)) {
      candidates.push({
        ruleId: "SEC-002",
        severity: "critical",
        filePath: file.path,
        lineStart: 1,
        lineEnd: 1,
        snippet: file.path,
        reason: "환경 변수 파일이 PR 에 포함됨",
      });
      continue;
    }
    // 내용을 읽지 않은 파일(형식 밖, 개수 제한 초과)도 추가된 줄의 비밀값은 확인한다.
    if (file.content !== undefined) continue;
    for (const { line, text } of parsePatch(file.patch).added) {
      for (const secret of findSecrets(text)) {
        candidates.push({
          ruleId: "SEC-001",
          severity: "critical",
          filePath: file.path,
          lineStart: line,
          lineEnd: line,
          snippet: text.trim(),
          reason: `${secret.name} 형식의 값`,
        });
      }
    }
  }

  const input: PrInput = {
    files,
    documentedEnv: envTemplates ? envNames(envTemplates) : null,
  };
  for (const rule of PR_RULES) {
    try {
      candidates.push(...rule.detect(input));
    } catch (error) {
      errors.push({
        ruleId: rule.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { candidates, errors };
}
