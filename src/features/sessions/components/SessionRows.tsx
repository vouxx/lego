import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import { StatusDot, type StatusTone } from "@/shared/ui/status-dot";
import { TOOL_LABELS, VISIBILITY_LABELS, type SessionCard } from "../schemas";

type Props = { sessions: SessionCard[] };

const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  uploading: { label: "올리는 중", tone: "muted" },
  queued: { label: "분석 대기", tone: "muted" },
  analyzing: { label: "분석 중", tone: "busy" },
  done: { label: "분석 끝", tone: "ok" },
  failed: { label: "실패", tone: "danger" },
};

/** 내 세션 목록: 한 줄에 하나. */
export function SessionRows({ sessions }: Props) {
  return (
    <ul className="divide-y rounded-lg border">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link
            href={`/sessions/${s.id}`}
            className="hover:bg-muted/50 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{s.title}</span>
              {s.goal ? (
                <span className="text-muted-foreground truncate text-xs">
                  {s.goal}
                </span>
              ) : null}
            </span>
            <span className="w-24">
              <StatusDot {...(STATUS[s.status] ?? STATUS.queued!)} />
            </span>
            <span className="text-muted-foreground w-48 font-mono text-xs">
              {TOOL_LABELS[s.tool]} · {VISIBILITY_LABELS[s.visibility]}
            </span>
            <span className="text-muted-foreground font-mono text-xs">
              {formatDateTime(s.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
