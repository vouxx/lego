import type { ReactNode } from "react";
import Link from "next/link";
import { LandingContainer } from "./LandingContainer";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "/#accuracy", label: "탐지율" },
  { href: "/#case", label: "작동 방식" },
  { href: "/#data", label: "데이터 처리" },
  { href: "/concepts", label: "개념 사전" },
] as const;

type Props = {
  /** 오른쪽 계정 영역(로그인 링크 또는 계정). 쿠키를 읽으므로 Suspense 안에 넣어 넘긴다. */
  account: ReactNode;
};

/** 랜딩·개념 사전 같은 공개 화면의 헤더. */
export function MarketingHeader({ account }: Props) {
  return (
    <header className="bg-background">
      <LandingContainer className="flex min-h-16 flex-wrap items-center gap-x-8 gap-y-2 py-3">
        <Link href="/" className="mr-auto" aria-label="레고 처음 화면">
          <Wordmark />
        </Link>
        <nav
          aria-label="주요 메뉴"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
        >
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <span className="flex items-center gap-2">{account}</span>
        </nav>
      </LandingContainer>
    </header>
  );
}
