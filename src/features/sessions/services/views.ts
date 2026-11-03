import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  findMyLike,
  getMySession,
  getSharedSessionBySlug,
  listMyProjects,
  listMySessions,
  listPublicTags,
  searchPublicSessions,
} from "../repository";
import {
  INSIGHT_KINDS,
  SESSION_TOOLS,
  statsSchema,
  VISIBILITIES,
  type InsightKind,
  type InsightView,
  type SessionCard,
  type SessionMessage,
  type SessionStats,
  type SessionTool,
  type Visibility,
} from "../schemas";
import { isAnalysisStale } from "./analyze";
import { readSessionFile } from "./files";

const TIMELINE_LIMIT = 400;

type CardRow = {
  id: string;
  slug: string | null;
  title: string;
  tool: string;
  tags: string[];
  goal: string | null;
  like_count: number;
  created_at: string;
  status: string;
  visibility: string;
};

const pick = <T extends string>(
  list: readonly T[],
  value: string,
  fallback: T,
) => ((list as readonly string[]).includes(value) ? (value as T) : fallback);

function toCard(row: CardRow): SessionCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || "제목 없는 세션",
    tool: pick(SESSION_TOOLS, row.tool, "text"),
    tags: row.tags,
    goal: row.goal,
    likes: row.like_count,
    createdAt: row.created_at,
    status: row.status,
    visibility: pick(VISIBILITIES, row.visibility, "private"),
  };
}

function toInsights(
  rows: {
    id: string;
    kind: string;
    content: string;
    prompt_text: string | null;
    turn_index: number | null;
    sort_order: number;
  }[],
): InsightView[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => ({
      id: r.id,
      kind: pick<InsightKind>(INSIGHT_KINDS, r.kind, "lesson"),
      content: r.content,
      promptText: r.prompt_text,
      turnIndex: r.turn_index,
    }));
}

export type SessionDetail = {
  card: SessionCard;
  outcome: string | null;
  stats: SessionStats | null;
  insights: InsightView[];
  messages: SessionMessage[];
  totalMessages: number;
};

async function timeline(path: string) {
  const file = await readSessionFile(path);
  const messages = file?.messages ?? [];
  return {
    messages: messages.slice(0, TIMELINE_LIMIT),
    total: messages.length,
  };
}

export async function getMySessionCards(): Promise<Result<SessionCard[]>> {
  const { data, error } = await listMySessions();
  if (error) return err("db_error", "세션 목록을 불러오지 못했습니다.");
  return ok(data.map(toCard));
}

export async function getUploadProjects() {
  const { data } = await listMyProjects();
  return (data ?? []).map((p) => ({ id: p.id, name: p.repo_full_name }));
}

export async function getMySessionDetail(
  sessionId: string,
): Promise<
  Result<SessionDetail & { error: string | null; canRetry: boolean }>
> {
  const { data: row } = await getMySession(sessionId);
  if (!row) return err("not_found", "세션을 찾을 수 없습니다.");
  const { messages, total } =
    row.status === "uploading"
      ? { messages: [], total: 0 }
      : await timeline(row.storage_path);
  const stats = statsSchema.safeParse(row.stats);
  return ok({
    card: toCard(row),
    outcome: row.outcome,
    stats: stats.success ? stats.data : null,
    insights: toInsights(row.session_insights),
    messages,
    totalMessages: total,
    error: row.error,
    canRetry:
      row.status === "failed" ||
      row.status === "queued" ||
      (row.status === "analyzing" && isAnalysisStale(row.analysis_started_at)),
  });
}

/** 링크 공유·공개 세션. 로그인하지 않아도 볼 수 있다. */
export async function getSharedSession(slug: string): Promise<
  | (SessionDetail & {
      author: string | null;
      hidden: boolean;
      viewer: { loggedIn: boolean; isOwner: boolean; liked: boolean };
    })
  | null
> {
  const { data: row } = await getSharedSessionBySlug(slug);
  if (!row) return null;
  const user = await getCurrentUser();
  const isOwner = user?.id === row.user_id;
  if (row.hidden && !isOwner) return null;
  const liked = user
    ? Boolean((await findMyLike(row.id, user.id)).data)
    : false;
  const { messages, total } = await timeline(row.storage_path);
  const stats = statsSchema.safeParse(row.stats);
  return {
    card: toCard(row),
    outcome: row.outcome,
    stats: stats.success ? stats.data : null,
    insights: toInsights(row.session_insights),
    messages,
    totalMessages: total,
    author: row.profiles?.github_login ?? null,
    hidden: row.hidden,
    viewer: { loggedIn: Boolean(user), isOwner, liked },
  };
}

/** 공개 페이지 메타데이터·공유 이미지용(로그인 정보 없이). */
export async function getSharedSessionMeta(slug: string) {
  const { data: row } = await getSharedSessionBySlug(slug);
  if (!row || row.hidden) return null;
  return {
    title: row.title || "AI 코딩 세션",
    goal: row.goal ?? "",
    tags: row.tags,
    tool: pick<SessionTool>(SESSION_TOOLS, row.tool, "text"),
    insights: row.session_insights.length,
  };
}

export type GalleryFilter = {
  q: string | null;
  tag: string | null;
  tool: SessionTool | null;
  sort: "recent" | "likes";
};

export function parseGalleryFilter(
  params: Record<string, string | string[] | undefined>,
): GalleryFilter {
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || null;
  const tool = one(params.tool);
  return {
    q: one(params.q)?.slice(0, 80) ?? null,
    tag: one(params.tag)?.slice(0, 40) ?? null,
    tool:
      tool && (SESSION_TOOLS as readonly string[]).includes(tool)
        ? (tool as SessionTool)
        : null,
    sort: one(params.sort) === "likes" ? "likes" : "recent",
  };
}

export async function getGallery(filter: GalleryFilter) {
  const [sessions, tags] = await Promise.all([
    searchPublicSessions(filter),
    listPublicTags(),
  ]);
  const counts = new Map<string, number>();
  for (const row of tags.data ?? []) {
    for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return {
    sessions: (sessions.data ?? []).map((row) => ({
      ...toCard(row),
      author: row.profiles?.github_login ?? null,
    })),
    tags: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t),
  };
}

export type { Visibility };
