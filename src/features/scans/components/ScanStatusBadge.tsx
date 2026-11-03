import { StatusDot, type StatusTone } from "@/shared/ui/status-dot";
import type { ScanStatus } from "../schemas";

const STATUS: Record<ScanStatus, { label: string; tone: StatusTone }> = {
  queued: { label: "대기 중", tone: "muted" },
  running: { label: "검사 중", tone: "busy" },
  done: { label: "완료", tone: "ok" },
  failed: { label: "실패", tone: "danger" },
};

type Props = { status: ScanStatus };

export function ScanStatusBadge({ status }: Props) {
  return <StatusDot {...STATUS[status]} />;
}
