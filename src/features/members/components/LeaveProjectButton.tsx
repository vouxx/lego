import { DeleteButton } from "@/shared/ui/delete-button";
import { leaveProjectAction } from "../actions";

type Props = { projectId: string; repoFullName: string };

export function LeaveProjectButton({ projectId, repoFullName }: Props) {
  return (
    <DeleteButton
      action={leaveProjectAction.bind(null, { projectId })}
      redirectTo="/projects"
      label="프로젝트에서 나가기"
      confirmText={`${repoFullName} 를 더 볼 수 없게 됩니다.`}
    />
  );
}
