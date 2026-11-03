import type { TaskOutline, TaskStatus } from "../schemas";

export type GraphResult =
  { ok: true; tasks: TaskOutline[] } | { ok: false; error: string };

const MIN_TASKS = 5;
const MAX_TASKS = 25;

/**
 * 모델이 준 작업 목록을 검사하고 키를 T-1, T-2 … 순서로 다시 매긴다.
 * 키 중복, 없는 선행 작업, 순환 의존이 있으면 오류 문장을 돌려준다(모델에게 다시 요청할 때 쓴다).
 */
export function normalizeTaskGraph(tasks: TaskOutline[]): GraphResult {
  if (tasks.length < MIN_TASKS || tasks.length > MAX_TASKS) {
    return {
      ok: false,
      error: `작업은 ${MIN_TASKS}~${MAX_TASKS}개여야 합니다(받은 개수 ${tasks.length}).`,
    };
  }

  const keys = new Map<string, string>();
  for (const [i, task] of tasks.entries()) {
    if (keys.has(task.key)) {
      return { ok: false, error: `작업 키 ${task.key} 가 중복됩니다.` };
    }
    keys.set(task.key, `T-${i + 1}`);
  }

  const renamed: TaskOutline[] = [];
  for (const task of tasks) {
    const key = keys.get(task.key)!;
    const deps: string[] = [];
    for (const dep of task.dependsOn) {
      const mapped = keys.get(dep);
      if (!mapped) {
        return {
          ok: false,
          error: `${task.key} 의 선행 작업 ${dep} 가 목록에 없습니다.`,
        };
      }
      if (mapped === key) {
        return { ok: false, error: `${task.key} 가 자기 자신에 의존합니다.` };
      }
      if (!deps.includes(mapped)) deps.push(mapped);
    }
    renamed.push({ ...task, key, dependsOn: deps });
  }

  const cycle = findCycle(renamed);
  if (cycle) {
    return { ok: false, error: `순환 의존이 있습니다: ${cycle.join(" → ")}` };
  }
  return { ok: true, tasks: renamed };
}

/** 순환이 있으면 순환 경로(첫 키를 끝에 한 번 더)를, 없으면 null. */
export function findCycle(
  tasks: Pick<TaskOutline, "key" | "dependsOn">[],
): string[] | null {
  const deps = new Map(tasks.map((t) => [t.key, t.dependsOn]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];

  const visit = (key: string): string[] | null => {
    if (state.get(key) === "done") return null;
    if (state.get(key) === "visiting") {
      return [...path.slice(path.indexOf(key)), key];
    }
    state.set(key, "visiting");
    path.push(key);
    for (const dep of deps.get(key) ?? []) {
      const found = visit(dep);
      if (found) return found;
    }
    path.pop();
    state.set(key, "done");
    return null;
  };

  for (const task of tasks) {
    const found = visit(task.key);
    if (found) return found;
  }
  return null;
}

/** 선행 작업 중 하나라도 끝나지 않았으면 잠긴 작업이다. */
export function isLocked(
  task: { dependsOn: string[] },
  statusByKey: Map<string, TaskStatus>,
) {
  return task.dependsOn.some((dep) => statusByKey.get(dep) !== "done");
}

/** 커밋 메시지에서 [T-3] 같은 작업 키를 뽑는다. */
export function taskKeysInMessage(message: string) {
  return [...new Set([...message.matchAll(/\[(T-\d+)\]/g)].map((m) => m[1]!))];
}
