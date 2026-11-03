import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import { CONTEXT_TARGETS, TARGET_INFO, type ContextTarget } from "../schemas";

type Props = { projectId: string; current: ContextTarget };

export function TargetTabs({ projectId, current }: Props) {
  return (
    <nav aria-label="규칙 파일 종류" className="flex flex-wrap gap-1 border-b">
      {CONTEXT_TARGETS.map((target) => (
        <Link
          key={target}
          href={`/projects/${projectId}/context?target=${target}`}
          aria-current={target === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm",
            target === current
              ? "border-primary font-medium"
              : "text-muted-foreground hover:text-foreground border-transparent",
          )}
        >
          {TARGET_INFO[target].path}
          <span className="text-muted-foreground ml-1 text-xs">
            {TARGET_INFO[target].tool}
          </span>
        </Link>
      ))}
    </nav>
  );
}
