import { Check, Loader2 } from "lucide-react";
import { GENERATION_STAGES, STAGE_LABELS } from "../schemas";

type Props = { stages: Partial<Record<string, string>> };

/** 단계 목록. done 은 체크, start 는 돌아가는 아이콘, 나머지는 대기. */
export function GenerationProgress({ stages }: Props) {
  return (
    <ol className="flex flex-col gap-2" aria-label="생성 진행">
      {GENERATION_STAGES.map((stage) => {
        const state = stages[stage];
        return (
          <li key={stage} className="flex items-center gap-2 text-sm">
            {state === "done" ? (
              <Check className="text-primary size-4" />
            ) : state === "start" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <span className="bg-muted size-4 rounded-full" />
            )}
            <span className={state ? "" : "text-muted-foreground"}>
              {STAGE_LABELS[stage]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
