import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import {
  SEVERITY_DOT,
  SEVERITY_LABELS,
  type Severity,
} from "@/shared/ui/severity";

type Props = {
  /** 시각 · 단계 */
  when: string;
  /** 문제를 찾은 단계면 그 등급(점 색 + 읽기 프로그램용 글자) */
  severity?: Severity;
  /** 마지막 단계는 아래 선을 긋지 않는다 */
  last?: boolean;
  /** 본문 아래에 붙는 것(예: 줄 코멘트 모형) */
  extra?: ReactNode;
  children: ReactNode;
};

/** 세로 기록의 한 단계. 왼쪽 점과 선, 오른쪽 시각과 설명. */
export function TimelineStep({
  when,
  severity,
  last = false,
  extra,
  children,
}: Props) {
  return (
    <li className="flex gap-5">
      <div
        className="flex w-3 flex-none flex-col items-center"
        aria-hidden="true"
      >
        <span
          className={cn(
            "mt-2 size-2.5 rounded-full",
            severity ? SEVERITY_DOT[severity] : "bg-foreground",
          )}
        />
        {last ? null : <span className="bg-input w-px flex-1" />}
      </div>
      <div
        className={cn("flex min-w-0 flex-1 flex-col gap-3.5", !last && "pb-9")}
      >
        <div>
          <p className="text-muted-foreground font-mono text-xs">
            {when}
            {severity ? ` · ${SEVERITY_LABELS[severity]}` : null}
          </p>
          <p className="mt-1.5 leading-relaxed sm:text-base">{children}</p>
        </div>
        {extra}
      </div>
    </li>
  );
}
