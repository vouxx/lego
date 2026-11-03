import type { ContextView } from "../services/view";
import { ContextWorkspace } from "./ContextWorkspace";
import { EmptyContext } from "./EmptyContext";
import { FreshnessNotice } from "./FreshnessNotice";
import { TargetTabs } from "./TargetTabs";

type Props = { view: ContextView };

export function ContextScreen({ view }: Props) {
  const { project, target, file } = view;
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold break-all">
          {project.repoFullName}
        </h1>
        <p className="text-muted-foreground text-sm">
          AI 코딩 도구가 작업 전에 읽는 규칙 파일을 만들고 다듬습니다.
        </p>
      </div>
      <TargetTabs projectId={project.id} current={target} />
      {file ? (
        <>
          <FreshnessNotice
            projectId={project.id}
            target={target}
            outdated={file.outdated}
            hasNewCommit={file.hasNewCommit}
          />
          <ContextWorkspace key={file.id} target={target} file={file} />
        </>
      ) : (
        <EmptyContext projectId={project.id} target={target} />
      )}
    </>
  );
}
