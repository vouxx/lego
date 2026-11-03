import Link from "next/link";
import { formatDateTime } from "@/shared/lib/format";
import { buttonVariants } from "@/shared/ui/button";
import { StatusDot, type StatusTone } from "@/shared/ui/status-dot";
import { TerminalWindow } from "@/shared/ui/terminal-window";
import type { SpecStatus, SpecSummary } from "../schemas";

type Props = { specs: SpecSummary[] };

const STATUS: Record<SpecStatus, { label: string; tone: StatusTone }> = {
  questions: { label: "질문 답변 대기", tone: "muted" },
  generating: { label: "만드는 중", tone: "busy" },
  ready: { label: "완성", tone: "ok" },
  failed: { label: "실패", tone: "danger" },
};

export function SpecList({ specs }: Props) {
  if (specs.length === 0) {
    return (
      <TerminalWindow title="시작하기">
        <div className="flex flex-col items-start gap-3 py-2 font-sans">
          <p className="text-terminal-muted font-mono">
            $ lego spec &quot;중고책 거래 앱&quot;
          </p>
          <p className="text-base font-semibold">한 줄 아이디어로 시작하세요</p>
          <p className="text-terminal-muted text-sm">
            PRD, 데이터 모델, 화면, 작업별 구현 프롬프트까지 2분 안에 만듭니다.
          </p>
          <Link
            href="/specs/new"
            className={buttonVariants({ variant: "secondary" })}
          >
            아이디어로 시작하기
          </Link>
        </div>
      </TerminalWindow>
    );
  }
  return (
    <ul className="divide-y rounded-lg border">
      {specs.map((spec) => {
        const pct = spec.taskCount
          ? Math.round((spec.doneCount / spec.taskCount) * 100)
          : 0;
        return (
          <li key={spec.id}>
            <Link
              href={`/specs/${spec.id}`}
              className="hover:bg-muted/50 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{spec.title}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {spec.idea}
                </span>
              </span>
              <span className="w-28">
                <StatusDot {...STATUS[spec.status]} />
              </span>
              <span className="flex w-36 items-center gap-2">
                <span className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <span
                    className="bg-ok block h-full"
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {spec.doneCount}/{spec.taskCount}
                </span>
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {formatDateTime(spec.createdAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
