import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

const NAV = [
  { href: "/#rules", label: "점검 항목" },
  { href: "/gallery", label: "갤러리" },
  { href: "/concepts", label: "개념 사전" },
];

export function MarketingHeader() {
  return (
    <header className="bg-background/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="font-mono font-semibold">
            lego<span className="text-ok">_</span>
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground hidden sm:inline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/projects" className={buttonVariants({ size: "sm" })}>
          시작하기
        </Link>
      </div>
    </header>
  );
}
