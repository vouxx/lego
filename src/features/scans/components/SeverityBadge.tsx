import { SeverityMark } from "@/shared/ui/severity";
import type { Severity } from "../schemas";

type Props = { severity: Severity };

export function SeverityBadge({ severity }: Props) {
  return (
    <span className="bg-muted inline-flex rounded-md px-2 py-0.5 font-mono text-xs">
      <SeverityMark severity={severity} />
    </span>
  );
}
