import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function MarketingHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
      <Link href="/" className="font-semibold">
        레고
      </Link>
      <Link href="/projects" className={buttonVariants({ size: "sm" })}>
        시작하기
      </Link>
    </header>
  );
}
