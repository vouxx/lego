import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function MarketingHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="font-semibold">
          레고
        </Link>
        <Link
          href="/gallery"
          className="text-muted-foreground hover:text-foreground"
        >
          갤러리
        </Link>
        <Link
          href="/concepts"
          className="text-muted-foreground hover:text-foreground"
        >
          개념 사전
        </Link>
      </nav>
      <Link href="/projects" className={buttonVariants({ size: "sm" })}>
        시작하기
      </Link>
    </header>
  );
}
