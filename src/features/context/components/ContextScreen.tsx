import { PageHeader } from "@/shared/ui/page-header";
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
      <PageHeader
        trail={[
          { href: "/projects", label: "프로젝트" },
          { href: `/projects/${project.id}`, label: project.repoFullName },
          { label: "규칙 파일" },
        ]}
        title="AI 규칙 파일"
        description="AI 코딩 도구가 작업 전에 읽는 규칙 파일을 만들고 다듬습니다."
      />
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
