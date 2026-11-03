import { Heart } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { TOOL_LABELS, type SessionCard } from "../schemas";
import { SessionRows } from "./SessionRows";

type Props = {
  sessions: (SessionCard & { author?: string | null })[];
  /** 갤러리는 /s/slug, 내 목록은 /sessions/id */
  linkTo: "public" | "mine";
  empty: string;
};

const STATUS_LABELS: Record<string, string> = {
  uploading: "올리는 중",
  queued: "분석 대기",
  analyzing: "분석 중",
  failed: "실패",
};

export function SessionCardList({ sessions, linkTo, empty }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {empty}
      </p>
    );
  }
  if (linkTo === "mine") return <SessionRows sessions={sessions} />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sessions.map((s) => (
        <li key={s.id}>
          <Card size="sm" className="h-full">
            <CardHeader>
              <CardTitle>
                <Link
                  href={
                    linkTo === "public" && s.slug
                      ? `/s/${s.slug}`
                      : `/sessions/${s.id}`
                  }
                  className="hover:underline"
                >
                  {s.title}
                </Link>
              </CardTitle>
              {s.goal ? (
                <CardDescription className="line-clamp-2">
                  {s.goal}
                </CardDescription>
              ) : null}
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                <span>{TOOL_LABELS[s.tool]}</span>
                {s.author ? <span>@{s.author}</span> : null}
                {STATUS_LABELS[s.status] ? (
                  <span>{STATUS_LABELS[s.status]}</span>
                ) : null}
                <span className="flex items-center gap-0.5">
                  <Heart className="size-3" /> {s.likes}
                </span>
                <span>{formatDateTime(s.createdAt)}</span>
              </p>
              {s.tags.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {s.tags.map((t) => `#${t}`).join(" ")}
                </p>
              ) : null}
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
