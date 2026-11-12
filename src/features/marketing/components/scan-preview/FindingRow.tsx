import { cn } from "@/shared/lib/cn";
import { SeverityMark } from "@/shared/ui/severity";
import type { PreviewFinding } from "../../content";

type Props = { finding: PreviewFinding; selected: boolean };

/** 발견 항목 한 줄. 선택된 줄은 왼쪽에 굵은 선. */
export function FindingRow({ finding, selected }: Props) {
  return (
    <tr className={cn("border-b align-top", selected && "bg-muted")}>
      <td
        className={cn(
          "border-l-3 px-4 py-3.5 text-xs",
          selected ? "border-l-foreground" : "border-l-transparent",
        )}
      >
        <SeverityMark severity={finding.severity} square />
      </td>
      <td className="px-2 py-3.5">
        <p className="font-medium">{finding.title}</p>
        <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
          {finding.id} · {finding.where}
        </p>
      </td>
      <td className="text-muted-foreground px-2 py-3.5 text-xs">
        {finding.verdict}
      </td>
      <td className="text-muted-foreground py-3.5 pr-4 pl-2 font-mono text-xs">
        {finding.since}
      </td>
    </tr>
  );
}
