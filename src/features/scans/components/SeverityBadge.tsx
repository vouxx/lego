import { Badge } from "@/shared/ui/badge";
import type { Severity } from "../schemas";

const LABELS: Record<Severity, string> = {
  critical: "치명적",
  high: "높음",
  medium: "보통",
  low: "낮음",
};

type Props = { severity: Severity };

export function SeverityBadge({ severity }: Props) {
  return (
    <Badge
      variant={
        severity === "critical" || severity === "high"
          ? "destructive"
          : "secondary"
      }
    >
      {LABELS[severity]}
    </Badge>
  );
}
