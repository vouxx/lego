import "server-only";
import { randomBytes } from "node:crypto";
import type { CurrentUser } from "@/lib/auth";
import { err, ok, type Result } from "@/shared/lib/result";
import {
  deleteLike,
  findMyLike,
  getInsightForCopy,
  getMySession,
  getShareableSession,
  insertLike,
  insertReport,
  insertTemplate,
  updateSession,
} from "../repository";
import type { Visibility } from "../schemas";

const SLUG_CHARS = "abcdefghijkmnopqrstuvwxyz23456789";

export function newSlug(length = 10) {
  return [...randomBytes(length)]
    .map((b) => SLUG_CHARS[b % SLUG_CHARS.length])
    .join("");
}

/** 공개 범위를 바꾼다. 처음 공유할 때 slug 를 만든다. 분석이 끝난 세션만 공유할 수 있다. */
export async function setVisibility(input: {
  sessionId: string;
  visibility: Visibility;
}): Promise<Result<{ slug: string | null }>> {
  const { data: session } = await getMySession(input.sessionId);
  if (!session) return err("not_found", "세션을 찾을 수 없습니다.");
  if (input.visibility !== "private" && session.status !== "done") {
    return err("not_ready", "분석이 끝난 뒤에 공유할 수 있습니다.");
  }
  const slug =
    session.slug ?? (input.visibility === "private" ? null : newSlug());
  const { error } = await updateSession(session.id, {
    visibility: input.visibility,
    slug,
  });
  return error
    ? err("db_error", "공개 범위를 바꾸지 못했습니다.")
    : ok({ slug });
}

/** 다른 사람이 볼 수 있는 세션인지(본인 세션은 항상). */
function canSee(
  session: {
    user_id: string;
    visibility: string;
    status: string;
    hidden: boolean;
  },
  userId: string,
) {
  if (session.user_id === userId) return true;
  return (
    session.status === "done" &&
    !session.hidden &&
    (session.visibility === "public" || session.visibility === "unlisted")
  );
}

/** 잘 먹힌 프롬프트를 내 prompt_templates 로 복사한다(3단계 작업 프롬프트 예시로 쓰인다). */
export async function saveInsightAsTemplate(
  user: CurrentUser,
  insightId: string,
): Promise<Result<null>> {
  const { data: insight } = await getInsightForCopy(insightId);
  if (!insight?.sessions || !canSee(insight.sessions, user.id)) {
    return err("not_found", "인사이트를 찾을 수 없습니다.");
  }
  const body = insight.prompt_text?.trim() || insight.content;
  const { error } = await insertTemplate({
    owner_id: user.id,
    title: insight.content.slice(0, 60),
    body,
    tags: insight.sessions.tags,
    source: "session_insight",
  });
  return error ? err("db_error", "템플릿으로 저장하지 못했습니다.") : ok(null);
}

export async function toggleLike(
  user: CurrentUser,
  sessionId: string,
): Promise<Result<{ liked: boolean }>> {
  const { data: session } = await getShareableSession(sessionId);
  if (
    !session ||
    !canSee(session, user.id) ||
    session.visibility === "private"
  ) {
    return err("not_found", "세션을 찾을 수 없습니다.");
  }
  const { data: like } = await findMyLike(sessionId, user.id);
  const { error } = like
    ? await deleteLike(sessionId, user.id)
    : await insertLike(sessionId, user.id);
  return error
    ? err("db_error", "좋아요를 바꾸지 못했습니다.")
    : ok({ liked: !like });
}

export async function reportSession(
  user: CurrentUser,
  input: { sessionId: string; reason: string },
): Promise<Result<null>> {
  const { data: session } = await getShareableSession(input.sessionId);
  if (!session || session.user_id === user.id || !canSee(session, user.id)) {
    return err("not_found", "세션을 찾을 수 없습니다.");
  }
  const { error } = await insertReport({
    session_id: input.sessionId,
    reporter_id: user.id,
    reason: input.reason,
  });
  return error ? err("db_error", "신고를 저장하지 못했습니다.") : ok(null);
}
