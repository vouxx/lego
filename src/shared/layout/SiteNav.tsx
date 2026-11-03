"use client";

import { usePathname } from "next/navigation";
import { SiteNavLinks } from "./SiteNavLinks";

/** 현재 주소를 읽어 메뉴를 강조한다. SiteHeader 가 Suspense 로 감싸고 SiteNavLinks 를 fallback 으로 쓴다. */
export function SiteNav() {
  return <SiteNavLinks activePath={usePathname()} />;
}
