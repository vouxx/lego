import type { ContextTarget } from "../schemas";
import { GenerateContextButton } from "./GenerateContextButton";

type Props = {
  projectId: string;
  target: ContextTarget;
  outdated: boolean;
  hasNewCommit: boolean;
};

/** 분석 뒤 리포가 바뀌었으면 다시 분석하라고 알린다. */
export function FreshnessNotice({
  projectId,
  target,
  outdated,
  hasNewCommit,
}: Props) {
  if (!outdated && !hasNewCommit) return null;
  return (
    <div
      role="status"
      className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-md p-3"
    >
      <p className="text-sm">
        {outdated
          ? "package.json 이나 폴더 구성이 바뀌었습니다. 다시 분석하면 규칙 파일을 최신으로 맞춥니다."
          : "분석한 뒤 리포에 새 커밋이 있습니다. 필요하면 다시 분석해 주세요."}
      </p>
      <GenerateContextButton
        projectId={projectId}
        target={target}
        label="다시 분석"
        variant="outline"
      />
    </div>
  );
}
