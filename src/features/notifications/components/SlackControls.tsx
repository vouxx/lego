"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import {
  disconnectSlackAction,
  sendSlackTestAction,
  setNotifyAction,
} from "../actions";
import { NOTIFY_KINDS, NOTIFY_LABELS, type NotifyKind } from "../schemas";

type Props = { projectId: string; notify: Record<NotifyKind, boolean> };

/** 연결된 뒤: 알림 종류 켜고 끄기, 시험 메시지, 연결 해제 */
export function SlackControls({ projectId, notify }: Props) {
  const router = useRouter();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  // 누르자마자 바뀌어 보이게 하고, 실패하면 되돌린다.
  const [checked, setChecked] = useState(notify);
  const [isPending, startTransition] = useTransition();

  const run = (
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>,
    done?: string,
  ) =>
    startTransition(async () => {
      setNote(null);
      const result = await fn();
      if (!result.ok)
        setNote({ ok: false, text: result.error?.message ?? "실패했습니다." });
      else if (done) setNote({ ok: true, text: done });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2" disabled={isPending}>
        <legend className="mb-1 text-sm font-medium">알릴 것</legend>
        {NOTIFY_KINDS.map((kind) => (
          <label key={kind} className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked[kind]}
              onChange={(e) => {
                const enabled = e.target.checked;
                setChecked((c) => ({ ...c, [kind]: enabled }));
                run(async () => {
                  const result = await setNotifyAction({
                    projectId,
                    kind,
                    enabled,
                  });
                  if (!result.ok)
                    setChecked((c) => ({ ...c, [kind]: !enabled }));
                  return result;
                });
              }}
            />
            <span>
              {NOTIFY_LABELS[kind].label}
              <span className="text-muted-foreground block text-xs">
                {NOTIFY_LABELS[kind].text}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(
              () => sendSlackTestAction({ projectId }),
              "시험 메시지를 보냈습니다. Slack 채널을 확인해 주세요.",
            )
          }
        >
          시험 메시지 보내기
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Slack 알림 연결을 끊을까요?")) return;
            run(() => disconnectSlackAction({ projectId }));
          }}
        >
          연결 끊기
        </Button>
      </div>
      {note ? (
        <p
          role={note.ok ? "status" : "alert"}
          className={note.ok ? "text-sm" : "text-destructive text-sm"}
        >
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
