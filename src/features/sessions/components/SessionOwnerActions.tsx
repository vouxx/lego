import { DeleteButton } from "@/shared/ui/delete-button";
import { deleteSessionAction } from "../actions";
import type { SessionCard } from "../schemas";
import { VisibilityControl } from "./VisibilityControl";

type Props = { card: SessionCard };

/** 내 세션에서만 보이는 공개 범위·지우기. */
export function SessionOwnerActions({ card }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <VisibilityControl
        sessionId={card.id}
        visibility={card.visibility}
        slug={card.slug}
        disabled={card.status !== "done"}
      />
      <DeleteButton
        action={deleteSessionAction.bind(null, { sessionId: card.id })}
        redirectTo="/sessions"
        label="세션 지우기"
        confirmText="세션과 올린 파일, 인사이트를 지웁니다."
      />
    </div>
  );
}
