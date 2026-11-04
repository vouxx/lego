import { CopyButton } from "@/shared/ui/copy-button";
import { verifyLiveTargetAction } from "../actions";
import { VERIFY_PATH, type LiveTargetView } from "../schemas";
import { LiveActionButton } from "./LiveActionButton";

type Props = { projectId: string; target: LiveTargetView };

/** 소유 확인 안내: 사이트에 토큰 파일을 올린 뒤 확인 버튼 */
export function LiveVerifyBox({ projectId, target }: Props) {
  return (
    <section
      aria-labelledby="verify-title"
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 id="verify-title" className="font-semibold">
        소유 확인
      </h2>
      <p className="text-sm">
        남의 사이트를 점검하지 않도록, 내 사이트인지 먼저 확인합니다. 아래
        내용을{" "}
        <code className="font-mono text-xs">
          {target.siteUrl}
          {VERIFY_PATH}
        </code>{" "}
        에서 열리게 배포해 주세요. Next.js 라면{" "}
        <code className="font-mono text-xs">public{VERIFY_PATH}</code> 파일로
        넣으면 됩니다.
      </p>
      <div className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2">
        <code className="font-mono text-xs break-all">
          {target.verifyToken}
        </code>
        <CopyButton text={target.verifyToken} />
      </div>
      <LiveActionButton
        action={verifyLiveTargetAction.bind(null, { projectId })}
        label="배포했어요, 확인하기"
        pendingLabel="확인하는 중…"
      />
    </section>
  );
}
