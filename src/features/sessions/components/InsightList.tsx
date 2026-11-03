import { CopyButton } from "@/shared/ui/copy-button";
import { INSIGHT_KINDS, INSIGHT_LABELS, type InsightView } from "../schemas";
import { SaveTemplateButton } from "./SaveTemplateButton";

type Props = {
  insights: InsightView[];
  /** 로그인한 사용자만 템플릿으로 저장할 수 있다 */
  canSave: boolean;
  saveLabel?: string;
};

export function InsightList({ insights, canSave, saveLabel }: Props) {
  if (insights.length === 0) return null;
  return (
    <div className="flex flex-col gap-5">
      {INSIGHT_KINDS.map((kind) => {
        const items = insights.filter((i) => i.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} className="flex flex-col gap-2">
            <h3 className="font-semibold">{INSIGHT_LABELS[kind]}</h3>
            <ul className="flex flex-col gap-3">
              {items.map((insight) => (
                <li
                  key={insight.id}
                  className="flex flex-col gap-2 rounded-md border p-3 text-sm"
                >
                  <p>
                    {insight.content}
                    {insight.turnIndex !== null ? (
                      <a
                        href={`#turn-${insight.turnIndex}`}
                        className="text-muted-foreground ml-2 text-xs underline"
                      >
                        #{insight.turnIndex}
                      </a>
                    ) : null}
                  </p>
                  {insight.promptText ? (
                    <pre className="bg-muted rounded p-2 text-xs whitespace-pre-wrap">
                      {insight.promptText}
                    </pre>
                  ) : null}
                  {kind === "good_prompt" ? (
                    <div className="flex flex-wrap gap-2">
                      <CopyButton
                        text={insight.promptText ?? insight.content}
                        label="프롬프트 복사"
                        size="xs"
                      />
                      {canSave ? (
                        <SaveTemplateButton
                          insightId={insight.id}
                          label={saveLabel}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
