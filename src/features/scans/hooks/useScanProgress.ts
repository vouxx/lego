"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScanStatus } from "../schemas";

export type ScanProgressState = {
  status: ScanStatus;
  progress: number;
  error: string | null;
};

const POLL_MS = 4000;

/**
 * 스캔 진행률을 Realtime 으로 받는다. Realtime 연결이 늦거나 끊겨도 멈추지 않도록 폴링을 함께 돈다.
 * 끝난 상태(done/failed)가 되면 둘 다 멈춘다.
 */
export function useScanProgress(scanId: string, initial: ScanProgressState) {
  const [state, setState] = useState(initial);
  const finished = state.status === "done" || state.status === "failed";

  useEffect(() => {
    if (finished) return;
    const supabase = createClient();
    const apply = (row: {
      status: string;
      progress: number;
      error: string | null;
    }) =>
      setState({
        status: row.status as ScanStatus,
        progress: row.progress,
        error: row.error,
      });

    const channel = supabase
      .channel(`scan:${scanId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "lego",
          table: "scans",
          filter: `id=eq.${scanId}`,
        },
        (payload) =>
          apply(
            payload.new as {
              status: string;
              progress: number;
              error: string | null;
            },
          ),
      )
      .subscribe();

    const timer = setInterval(async () => {
      const { data } = await supabase
        .from("scans")
        .select("status, progress, error")
        .eq("id", scanId)
        .maybeSingle();
      if (data) apply(data);
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [scanId, finished]);

  return state;
}
