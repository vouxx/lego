import { DeleteButton } from "@/shared/ui/delete-button";
import { PageHeader } from "@/shared/ui/page-header";
import { removeLiveTargetAction, runLiveCheckAction } from "../actions";
import type { LiveCheckView, LiveTargetView } from "../schemas";
import { LiveActionButton } from "./LiveActionButton";
import { LiveCheckReport } from "./LiveCheckReport";
import { LiveHistory } from "./LiveHistory";
import { LiveTargetForm } from "./LiveTargetForm";
import { LiveVerifyBox } from "./LiveVerifyBox";

type Props = {
  projectId: string;
  repoFullName: string;
  target: LiveTargetView | null;
  checks: LiveCheckView[];
};

export function LiveScreen({ projectId, repoFullName, target, checks }: Props) {
  const latest = checks[0];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        trail={[
          { href: "/projects", label: "프로젝트" },
          { href: `/projects/${projectId}`, label: repoFullName },
          { label: "운영 점검" },
        ]}
        title="운영 상태 점검"
        description="코드가 아니라 배포된 사이트를 밖에서 공격자가 보는 그대로 확인합니다. 로그인 없이 읽히는 테이블·버킷, 배포된 JS 의 비밀 키, 보안 헤더, 열려 있는 .env·.git 을 봅니다. 읽기 요청만 보내고, 응답 내용은 저장하지 않습니다."
        actions={
          target ? (
            <DeleteButton
              action={removeLiveTargetAction.bind(null, { projectId })}
              redirectTo={`/projects/${projectId}/live`}
              label="점검 대상 지우기"
              confirmText="배포 주소와 점검 기록을 지웁니다."
            />
          ) : null
        }
      />
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold">배포 주소</p>
        <LiveTargetForm projectId={projectId} current={target?.siteUrl} />
      </section>
      {target && !target.verified ? (
        <LiveVerifyBox projectId={projectId} target={target} />
      ) : null}
      {target?.verified ? (
        <div className="flex flex-wrap items-center gap-3">
          <LiveActionButton
            action={runLiveCheckAction.bind(null, { projectId })}
            label="지금 점검"
            pendingLabel="점검하는 중… (최대 1분)"
          />
          <p className="text-muted-foreground text-sm">
            소유 확인 완료 · 하루 한 번 자동으로 다시 점검하고, 새로 생긴 문제를
            표시합니다.
          </p>
        </div>
      ) : null}
      {latest ? <LiveCheckReport check={latest} /> : null}
      <LiveHistory checks={checks} />
    </div>
  );
}
