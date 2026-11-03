import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Props = {
  title: string;
  children: ReactNode;
  /** 제목 표시줄 오른쪽(복사 버튼 등) */
  actions?: ReactNode;
  className?: string;
};

/** 작업대 컨셉의 기본 틀: 제목 표시줄이 있는 어두운 패널. 프롬프트·명령·로그를 담는다. */
export function TerminalWindow({ title, children, actions, className }: Props) {
  return (
    <div
      className={cn(
        "bg-terminal text-terminal-foreground border-terminal-border overflow-hidden rounded-lg border font-mono text-xs leading-relaxed",
        className,
      )}
    >
      <div className="border-terminal-border flex items-center gap-2 border-b px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="bg-terminal-border size-2.5 rounded-full" />
          <span className="bg-terminal-border size-2.5 rounded-full" />
          <span className="bg-terminal-border size-2.5 rounded-full" />
        </span>
        <span className="text-terminal-muted min-w-0 flex-1 truncate">
          {title}
        </span>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
