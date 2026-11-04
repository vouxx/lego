import { StatusDot, type StatusTone } from "@/shared/ui/status-dot";
import { TASK_STATUSES, type SpecTaskView, type TaskStatus } from "../schemas";
import { TaskCard } from "./TaskCard";

type Props = { tasks: SpecTaskView[] };

const TONES: Record<TaskStatus, StatusTone> = {
  todo: "muted",
  doing: "busy",
  done: "ok",
};

const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

/** 할 일 / 진행 중 / 완료. 선행 작업이 끝나지 않은 작업은 자물쇠로 표시한다. */
export function TaskBoard({ tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="text-muted-foreground text-sm">작업이 없습니다.</p>;
  }
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        {done}/{tasks.length} 완료 · 커밋 메시지나 PR 제목에 [T-3] 처럼 작업 ID
        를 넣으면(브랜치 이름 t-3 도 됨) PR 이 작업에 이어지고, 기본 브랜치에
        들어가면 자동으로 완료됩니다.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {TASK_STATUSES.map((status) => {
          const column = tasks.filter((t) => t.status === status);
          return (
            <section
              key={status}
              className="flex flex-col gap-2"
              aria-label={COLUMN_LABELS[status]}
            >
              <h3 className="flex items-center justify-between border-b pb-2 text-sm font-semibold">
                <StatusDot
                  tone={TONES[status]}
                  label={COLUMN_LABELS[status]}
                  className="text-sm"
                />
                <span className="text-muted-foreground font-mono text-xs">
                  {column.length}
                </span>
              </h3>
              {column.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
