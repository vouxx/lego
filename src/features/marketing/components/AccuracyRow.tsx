import { cn } from "@/shared/lib/cn";
import { SeverityMark } from "@/shared/ui/severity";
import type { BenchmarkRule } from "../benchmark";

type Props = { rule: BenchmarkRule };

/** 규칙 한 줄: 번호, 점검 항목, 등급, 탐지 막대와 n/m, 놓친 수. */
export function AccuracyRow({ rule }: Props) {
  const total = rule.hit + rule.miss;
  const pct = total === 0 ? 0 : Math.round((rule.hit / total) * 100);
  return (
    <tr className="border-b">
      <td className="text-muted-foreground py-2.5 pr-4 font-mono text-xs">
        {rule.id}
      </td>
      <td className="py-2.5 pr-4">{rule.text}</td>
      <td className="py-2.5 pr-4 text-sm">
        <SeverityMark severity={rule.severity} square />
      </td>
      <td className="py-2.5 pr-4">
        <span className="flex items-center gap-2.5">
          <span className="bg-secondary block h-1.5 flex-1" aria-hidden="true">
            <span
              className="bg-foreground block h-1.5"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="text-muted-foreground min-w-8 text-right font-mono text-xs">
            {rule.hit}/{total}
          </span>
        </span>
      </td>
      <td
        className={cn(
          "py-2.5 text-right font-mono text-xs",
          rule.miss === 0 ? "text-muted-foreground" : "font-medium",
        )}
      >
        {rule.miss}
      </td>
    </tr>
  );
}
