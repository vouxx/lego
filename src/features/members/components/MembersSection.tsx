import { formatDateTime } from "@/shared/lib/format";
import { DeleteButton } from "@/shared/ui/delete-button";
import { cancelInviteAction, removeMemberAction } from "../actions";
import type { MemberView, PendingInviteView } from "../schemas";
import { InviteForm } from "./InviteForm";

type Props = {
  projectId: string;
  members: MemberView[];
  invites: PendingInviteView[];
};

/** 프로젝트 화면(소유자만): 같이 보는 사람 */
export function MembersSection({ projectId, members, invites }: Props) {
  const back = `/projects/${projectId}`;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="members-title">
      <div className="flex flex-col gap-1">
        <h2 id="members-title" className="text-lg font-semibold">
          팀 멤버
        </h2>
        <p className="text-muted-foreground text-sm">
          초대한 사람은 보안 점검 결과(문제가 된 코드 몇 줄 포함), PR 리뷰, 운영
          점검 결과를 볼 수 있습니다. 점검 실행, 설정 변경, 규칙 파일, 스펙은
          소유자만 씁니다.
        </p>
      </div>
      <InviteForm projectId={projectId} />
      {members.length + invites.length > 0 ? (
        <ul className="divide-y rounded-lg border" aria-label="멤버 목록">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
            >
              <span className="font-mono text-sm">@{m.githubLogin}</span>
              <DeleteButton
                action={removeMemberAction.bind(null, {
                  projectId,
                  userId: m.userId,
                })}
                redirectTo={back}
                label="내보내기"
                confirmText={`@${m.githubLogin} 님은 이 프로젝트를 더 볼 수 없게 됩니다.`}
              />
            </li>
          ))}
          {invites.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
            >
              <span className="font-mono text-sm">
                @{i.githubLogin}
                <span className="text-muted-foreground ml-2 font-sans text-xs">
                  수락 대기 · {formatDateTime(i.expiresAt)} 까지
                </span>
              </span>
              <DeleteButton
                action={cancelInviteAction.bind(null, {
                  projectId,
                  inviteId: i.id,
                })}
                redirectTo={back}
                label="초대 취소"
                confirmText={`@${i.githubLogin} 님에게 보낸 링크를 못 쓰게 합니다.`}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
