import { Suspense, type ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteNavLinks } from "./SiteNavLinks";

type Props = {
  /** 오른쪽 계정 영역. 쿠키를 읽으므로 Suspense 안에 넣어 넘긴다. */
  account: ReactNode;
};

/** 모든 화면(랜딩·공개 페이지·대시보드·로그인)이 같이 쓰는 헤더. */
export function SiteHeader({ account }: Props) {
  return (
    <header className="bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Suspense fallback={<SiteNavLinks activePath={null} />}>
          <SiteNav />
        </Suspense>
        <div className="flex shrink-0 items-center gap-2">{account}</div>
      </div>
    </header>
  );
}
