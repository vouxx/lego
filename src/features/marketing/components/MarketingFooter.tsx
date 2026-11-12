import Link from "next/link";
import { ctaButtonClass } from "../cta";
import { BENCHMARK_RESULTS_URL } from "../benchmark";
import { LandingContainer } from "./LandingContainer";

const LINKS = [
  { href: "/concepts", label: "개념 사전" },
  { href: BENCHMARK_RESULTS_URL, label: "측정 결과" },
  { href: "/#data", label: "데이터 처리" },
  { href: "https://github.com/vouxx/lego", label: "GitHub" },
] as const;

/** 한 줄 문구와 시작 버튼, 그 아래 링크. */
export function MarketingFooter() {
  return (
    <footer className="bg-background border-t">
      <LandingContainer className="flex flex-col gap-14 pt-16 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <p className="text-xl font-medium">
            첫 점검은 리포 하나만 고르면 시작됩니다.
          </p>
          <Link href="/projects" className={ctaButtonClass}>
            GitHub 로 리포 점검
          </Link>
        </div>
        <div className="text-muted-foreground flex flex-wrap justify-between gap-4 border-t pt-6 text-sm">
          <span className="text-foreground font-mono tracking-widest">
            LEGO
          </span>
          <nav aria-label="바닥 메뉴" className="flex flex-wrap gap-6">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </LandingContainer>
    </footer>
  );
}
