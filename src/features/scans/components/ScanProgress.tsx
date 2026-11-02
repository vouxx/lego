"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Progress } from "@/shared/ui/progress";
import {
  useScanProgress,
  type ScanProgressState,
} from "../hooks/useScanProgress";
import { ScanStatusBadge } from "./ScanStatusBadge";

type Props = { scanId: string; initial: ScanProgressState };

function stageLabel(progress: number) {
  if (progress < 25) return "리포 파일을 읽는 중";
  if (progress < 30) return "정적 규칙으로 검사하는 중";
  if (progress < 70) return "AI가 오탐을 걸러내는 중";
  return "설명과 수정 프롬프트를 만드는 중";
}

export function ScanProgress({ scanId, initial }: Props) {
  const router = useRouter();
  const state = useScanProgress(scanId, initial);
  const finished = state.status === "done" || state.status === "failed";

  // 끝나면 서버에서 결과를 다시 그린다.
  useEffect(() => {
    if (finished && initial.status !== state.status) router.refresh();
  }, [finished, initial.status, state.status, router]);

  if (state.status === "failed") {
    return (
      <div className="flex flex-col gap-2">
        <ScanStatusBadge status="failed" />
        <p role="alert" className="text-destructive text-sm">
          {state.error ?? "점검 중 문제가 생겼습니다."}
        </p>
      </div>
    );
  }
  if (finished) return null;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <ScanStatusBadge status={state.status} />
          {state.status === "queued"
            ? "곧 시작합니다"
            : stageLabel(state.progress)}
        </span>
        <span className="text-muted-foreground">{state.progress}%</span>
      </div>
      <Progress value={state.progress} />
      {state.error ? (
        <p className="text-muted-foreground text-xs">{state.error}</p>
      ) : null}
    </div>
  );
}
