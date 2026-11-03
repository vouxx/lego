"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 다른 탭(GitHub 설정)에서 돌아오면 서버 데이터를 다시 불러온다. */
export function RefreshOnFocus() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [router]);
  return null;
}
