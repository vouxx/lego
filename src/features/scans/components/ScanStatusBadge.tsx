import { Badge } from "@/shared/ui/badge";
import type { ScanStatus } from "../schemas";

const LABELS: Record<ScanStatus, string> = {
  queued: "대기 중",
  running: "검사 중",
  done: "완료",
  failed: "실패",
};

type Props = { status: ScanStatus };

export function ScanStatusBadge({ status }: Props) {
  const variant =
    status === "failed"
      ? "destructive"
      : status === "done"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
