import type { ReactNode } from "react";
import { TOOL_LABELS } from "../schemas";
import type { SessionDetail as Detail } from "../services/views";
import { InsightList } from "./InsightList";
import { MessageTimeline } from "./MessageTimeline";
import { SessionStatsView } from "./SessionStatsView";

type Props = {
  detail: Detail;
  byline?: string | null;
  actions?: ReactNode;
  canSave: boolean;
  saveLabel?: string;
};

/** 내 세션 화면과 공개 세션 화면이 같이 쓰는 본문. */
export function SessionDetail({
  detail,
  byline,
  actions,
  canSave,
  saveLabel,
}: Props) {
  const { card } = detail;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground font-mono text-xs">
          {TOOL_LABELS[card.tool]}
          {byline ? ` · @${byline}` : ""}
          {card.tags.length
            ? ` · ${card.tags.map((t) => `#${t}`).join(" ")}`
            : ""}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {card.title}
        </h1>
        {card.goal ? (
          <p className="text-sm">
            <strong>목표</strong> {card.goal}
          </p>
        ) : null}
        {detail.outcome ? (
          <p className="text-sm">
            <strong>결과</strong> {detail.outcome}
          </p>
        ) : null}
        {actions}
      </div>
      {detail.stats ? <SessionStatsView stats={detail.stats} /> : null}
      <InsightList
        insights={detail.insights}
        canSave={canSave}
        saveLabel={saveLabel}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">대화 타임라인</h2>
        <MessageTimeline
          messages={detail.messages}
          total={detail.totalMessages}
          highlight={detail.insights.flatMap((i) =>
            i.turnIndex !== null ? [i.turnIndex] : [],
          )}
        />
      </section>
    </div>
  );
}
