import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export function Hero() {
  return (
    <section className="flex flex-col items-start gap-6 py-16 sm:py-24">
      <p className="text-muted-foreground text-sm font-medium">
        AI 로 만든 웹앱을 위한 보안 점검
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        배포하기 전에, 키가 새고 있지 않은지부터.
      </h1>
      <p className="text-muted-foreground max-w-2xl text-lg text-pretty">
        Claude Code, Cursor, Lovable 로 만든 앱에서 자주 생기는 보안 실수를 찾아
        드립니다. 무엇이 문제인지 쉬운 말로 설명하고, AI 코딩 도구에 그대로
        붙여넣을 수정 프롬프트까지 만들어 드려요.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/projects" className={buttonVariants({ size: "lg" })}>
          GitHub 리포 무료 점검
        </Link>
        <Link
          href="#rules"
          className={buttonVariants({ size: "lg", variant: "outline" })}
        >
          점검 항목 보기
        </Link>
      </div>
    </section>
  );
}
