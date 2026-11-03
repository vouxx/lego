"use client";

import { usePathname } from "next/navigation";
import { DashboardNavLinks } from "./DashboardNavLinks";

/** 현재 주소를 읽어 메뉴를 강조한다. 레이아웃에서 Suspense 로 감싸고 DashboardNavLinks 를 fallback 으로 쓴다. */
export function DashboardNav() {
  return <DashboardNavLinks activePath={usePathname()} />;
}
