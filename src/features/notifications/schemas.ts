import { z } from "zod";

export const NOTIFY_KINDS = ["live", "guard", "scan", "weekly"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export const NOTIFY_LABELS: Record<
  NotifyKind,
  { label: string; text: string }
> = {
  live: {
    label: "운영 점검",
    text: "하루 한 번 점검에서 새로 생긴 문제가 있을 때",
  },
  guard: {
    label: "PR 가드",
    text: "PR 의 상태 체크가 실패로 바뀌었거나 새 문제가 생겼을 때",
  },
  scan: { label: "보안 점검", text: "보안 점검이 끝났을 때(결과 요약)" },
  weekly: {
    label: "주간 요약",
    text: "매주 월요일 아침, 지난주의 새 문제·해결한 문제·PR 통과율",
  },
};

export const projectInput = z.object({ projectId: z.uuid() });
export const notifySettingInput = z.object({
  projectId: z.uuid(),
  kind: z.enum(NOTIFY_KINDS),
  enabled: z.boolean(),
});

export type SlackConnectionView = {
  teamName: string;
  channelName: string;
  notify: Record<NotifyKind, boolean>;
  lastError: string | null;
};
