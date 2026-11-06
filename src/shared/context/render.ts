import { codeSpan, safeLine } from "@/shared/lib/untrusted-text";
import { STACK_LABELS, type StackTag } from "@/shared/stack/schema";
import type { ContextAnalysis, ContextTarget, RuleLine } from "./schema";

const TITLES: Record<ContextTarget, string> = {
  claude_md: "# 프로젝트 규칙",
  cursorrules: "# 프로젝트 규칙 (Cursor)",
  agents_md: "# 프로젝트 규칙 (AGENTS.md)",
};

const VERSION_PACKAGE: Partial<Record<StackTag, string>> = {
  "nextjs-app-router": "next",
  "nextjs-pages-router": "next",
  react: "react",
  vite: "vite",
  typescript: "typescript",
  tailwind: "tailwindcss",
};

const SAFE_COMMAND = /^[\w:.@/ -]{1,120}$/;
const SAFE_PATH = /^[\w.@()[\]/ +-]{1,200}$/;

/** "^16.4.3" → "16". 범위·태그 같은 알 수 없는 값이면 null. */
export function majorVersion(range: string | undefined) {
  const match = range?.match(/(\d+)(?:\.\d+)*/);
  return match ? match[1]! : null;
}

export function stackText(stack: ContextAnalysis["stack"]) {
  const parts = stack.tags.map((tag) => {
    const pkg = VERSION_PACKAGE[tag];
    const major = pkg ? majorVersion(stack.versions[pkg]) : null;
    const label = STACK_LABELS[tag];
    if (tag === "nextjs-app-router" || tag === "nextjs-pages-router") {
      const router =
        tag === "nextjs-app-router" ? "App Router" : "Pages Router";
      return `Next.js${major ? ` ${major}` : ""} (${router})`;
    }
    return major ? `${label} ${major}` : label;
  });
  if (stack.packageManager) parts.push(`패키지 매니저 ${stack.packageManager}`);
  return parts.join(", ");
}

/**
 * 분석 결과와 켜진 규칙으로 규칙 파일을 만든다. 같은 입력이면 항상 같은 결과가 나온다.
 * 섹션 순서: 개요 → 기술 스택 → 명령어 → 폴더 구조 → 규칙(입력 순서) → 주의할 점.
 */
export function renderContext({
  target,
  analysis,
  rules,
}: {
  target: ContextTarget;
  analysis: ContextAnalysis;
  rules: RuleLine[];
}) {
  const blocks: string[] = [TITLES[target]];

  if (analysis.overview?.trim()) {
    blocks.push(`## 프로젝트 개요\n\n${analysis.overview.trim()}`);
  }

  const stack = stackText(analysis.stack);
  if (stack) blocks.push(`## 기술 스택\n\n${stack}`);

  if (analysis.commands.length > 0) {
    // 스크립트·폴더 이름은 리포에서 온 값이다. 평범한 이름이 아니면 규칙 파일에 넣지 않는다.
    const lines = analysis.commands
      .filter((c) => SAFE_COMMAND.test(c.command))
      .map((c) => `- ${safeLine(c.label, 40)}: ${codeSpan(c.command)}`);
    if (lines.length > 0) blocks.push(`## 명령어\n\n${lines.join("\n")}`);
  }

  const folders = analysis.folders.filter((f) => SAFE_PATH.test(f.path));
  if (folders.length > 0) {
    const lines = folders.map((f) => {
      const summary = safeLine(f.summary);
      const path = codeSpan(`${f.path}/`);
      return summary ? `- ${path} — ${summary}` : `- ${path}`;
    });
    blocks.push(`## 폴더 구조\n\n${lines.join("\n")}`);
  }

  const sections = new Map<string, string[]>();
  for (const rule of rules) {
    if (!rule.enabled || !rule.content.trim()) continue;
    const list = sections.get(rule.section) ?? [];
    list.push(`- ${rule.content.trim()}`);
    sections.set(rule.section, list);
  }
  for (const [section, lines] of sections) {
    blocks.push(`## ${section}\n\n${lines.join("\n")}`);
  }

  if (analysis.cautions.length > 0) {
    const lines = analysis.cautions.map((c) => {
      const where = c.files.map((f) => codeSpan(f)).join(", ");
      const more =
        c.count > c.files.length ? ` 외 ${c.count - c.files.length}곳` : "";
      return `- [${c.ruleId}] ${c.title} — ${where}${more}. 비슷한 코드를 만들 때 특히 확인한다.`;
    });
    blocks.push(
      `## 주의할 점 (보안 점검 결과에서 자동 추가)\n\n${lines.join("\n")}`,
    );
  }

  return `${blocks.join("\n\n")}\n`;
}
