import Link from "next/link";
import type { InviteView } from "../schemas";
import { AcceptInviteButton } from "./AcceptInviteButton";

type Props = { view: InviteView; token: string; myLogin: string };

/** 초대 링크를 연 화면 */
export function InviteScreen({ view, token, myLogin }: Props) {
  if (view.state === "invalid")
    return (
      <p className="text-muted-foreground text-sm">
        만료됐거나 이미 쓴 초대입니다. 초대한 분께 새 링크를 요청해 주세요.
      </p>
    );
  if (view.state === "wrong_account")
    return (
      <p className="text-muted-foreground text-sm">
        이 초대는 @{view.githubLogin} 계정용입니다. 지금은 @{myLogin} 로
        로그인되어 있습니다.
      </p>
    );
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        <span className="font-mono font-medium">{view.repoFullName}</span> 의
        보안 점검 결과, PR 리뷰, 운영 점검 결과를 볼 수 있게 됩니다. 수락하면
        소유자에게 내 GitHub 아이디가 보입니다.
      </p>
      <AcceptInviteButton token={token} />
      <Link
        href="/projects"
        className="text-muted-foreground text-sm hover:underline"
      >
        내 프로젝트로 돌아가기
      </Link>
    </div>
  );
}
