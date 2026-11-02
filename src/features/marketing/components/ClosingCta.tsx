import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function ClosingCta() {
  return (
    <section className="bg-muted flex flex-col items-start gap-4 rounded-xl p-8">
      <h2 className="text-2xl font-semibold">지금 리포 하나만 점검해 보세요</h2>
      <p className="text-muted-foreground text-sm">
        한 달에 스캔 30번까지 무료입니다. 카드 등록은 필요 없습니다.
      </p>
      <Link href="/projects" className={buttonVariants({ size: "lg" })}>
        GitHub 로 시작하기
      </Link>
    </section>
  );
}
