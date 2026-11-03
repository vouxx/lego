import { cn } from "@/shared/lib/cn";
import type { SessionMessage } from "../schemas";

type Props = {
  messages: SessionMessage[];
  total: number;
  highlight?: number[];
};

const ROLE_LABEL = { user: "사용자", assistant: "AI", tool: "도구" } as const;

/** 턴 타임라인. 인사이트의 턴 번호로 이동할 수 있게 id 를 붙인다. */
export function MessageTimeline({ messages, total, highlight = [] }: Props) {
  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">표시할 대화가 없습니다.</p>
    );
  }
  return (
    <ol className="flex flex-col gap-2">
      {messages.map((m, i) => (
        <li
          key={i}
          id={`turn-${i}`}
          className={cn(
            "scroll-mt-20 rounded-md border p-3 text-sm",
            m.role === "user" && "bg-muted/50",
            m.role === "tool" && "text-muted-foreground text-xs",
            m.isError && "border-destructive/40",
            highlight.includes(i) && "ring-primary ring-2",
          )}
        >
          <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
            <span>#{i}</span>
            <span className="font-medium">{ROLE_LABEL[m.role]}</span>
            {m.isError ? <span className="text-destructive">오류</span> : null}
          </div>
          {m.text ? (
            <p className="line-clamp-[12] break-words whitespace-pre-wrap">
              {m.text}
            </p>
          ) : null}
          {m.tools?.length ? (
            <ul className="mt-1 flex flex-wrap gap-1">
              {m.tools.map((t, j) => (
                <li
                  key={j}
                  className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs break-all"
                >
                  {t.name}
                  {t.target ? ` ${t.target}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
      {total > messages.length ? (
        <li className="text-muted-foreground text-sm">
          처음 {messages.length}턴만 보여 줍니다(전체 {total}턴).
        </li>
      ) : null}
    </ol>
  );
}
