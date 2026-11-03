import "server-only";
import { err, ok, type Result } from "@/shared/lib/result";
import { listContextRules, listRulePacks } from "../repository";
import {
  contextAnalysisSchema,
  type ChecklistGroup,
  type ContextAnalysis,
  type ContextTarget,
  type RuleLine,
} from "../schemas";
import { selectPacks, type RulePack } from "@/shared/context/packs";
import { renderContext } from "@/shared/context/render";

export const CUSTOM_GROUP = "직접 추가한 규칙";

export async function loadRulePacks(): Promise<Result<RulePack[]>> {
  const { data, error } = await listRulePacks();
  if (error) return err("db_error", "규칙 팩을 불러오지 못했습니다.");
  return ok(
    data.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      detect: p.detect,
      items: [...p.rule_pack_items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({
          id: i.id,
          section: i.section,
          content: i.content,
          sortOrder: i.sort_order,
          defaultEnabled: i.default_enabled,
        })),
    })),
  );
}

type RuleRow = {
  id: string;
  item_id: string | null;
  section: string | null;
  enabled: boolean;
  override_content: string | null;
};

/** 적용된 규칙 팩과 사용자 설정을 합쳐 체크리스트와 문서용 규칙 줄을 만든다. */
export function buildRuleState(
  packs: RulePack[],
  analysis: ContextAnalysis,
  rows: RuleRow[],
): { groups: ChecklistGroup[]; lines: RuleLine[] } {
  const byItem = new Map(
    rows.filter((r) => r.item_id).map((r) => [r.item_id!, r]),
  );
  const groups: ChecklistGroup[] = selectPacks(packs, analysis.stack.tags).map(
    (pack) => ({
      name: pack.name,
      items: pack.items.map((item) => {
        const row = byItem.get(item.id);
        return {
          id: item.id,
          custom: false,
          section: item.section,
          content: row?.override_content ?? item.content,
          enabled: row?.enabled ?? item.defaultEnabled,
        };
      }),
    }),
  );

  const custom = rows
    .filter((r) => !r.item_id && r.section && r.override_content)
    .map((r) => ({
      id: r.id,
      custom: true,
      section: r.section!,
      content: r.override_content!,
      enabled: r.enabled,
    }));
  if (custom.length > 0) groups.push({ name: CUSTOM_GROUP, items: custom });

  const lines = groups.flatMap((g) =>
    g.items.map(({ section, content, enabled }) => ({
      section,
      content,
      enabled,
    })),
  );
  return { groups, lines };
}

/** 저장된 분석과 현재 규칙 설정으로 문서를 다시 만든다(LLM 호출 없음). */
export async function renderForFile(file: {
  id: string;
  target: string;
  analysis: unknown;
}): Promise<Result<{ content: string; groups: ChecklistGroup[] }>> {
  const analysis = contextAnalysisSchema.safeParse(file.analysis);
  if (!analysis.success) {
    return err("not_analyzed", "리포를 먼저 분석해 주세요.");
  }
  const [packs, rows] = await Promise.all([
    loadRulePacks(),
    listContextRules(file.id),
  ]);
  if (!packs.ok) return packs;
  if (rows.error) return err("db_error", "규칙 설정을 불러오지 못했습니다.");

  const { groups, lines } = buildRuleState(
    packs.data,
    analysis.data,
    rows.data,
  );
  return ok({
    content: renderContext({
      target: file.target as ContextTarget,
      analysis: analysis.data,
      rules: lines,
    }),
    groups,
  });
}
