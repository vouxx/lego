import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { ScanTerminal } from "./ScanTerminal";

export function Hero() {
  return (
    <section className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
      <div className="flex flex-col items-start gap-6">
        <p className="text-muted-foreground font-mono text-xs">
          AI 로 만드는 앱의 작업대
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-balance break-keep sm:text-5xl">
          AI 가 쓴 코드,
          <br />
          배포 전에 한 번 더.
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-pretty break-keep">
          Claude Code·Cursor 로 만든 앱의 보안 실수를 찾고, 고칠 프롬프트를
          드립니다. 아이디어를 작업으로 나누는 것부터 PR 리뷰, 배포된 사이트
          점검까지 같은 리포·같은 작업 번호로 이어집니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/projects" className={buttonVariants({ size: "lg" })}>
            내 리포 무료 점검
          </Link>
          <Link
            href="/specs/new"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            아이디어로 시작
          </Link>
        </div>
        <p className="text-muted-foreground font-mono text-xs">
          GitHub 로그인 · 리포에는 PR·코멘트만 · 비밀 키는 가린 뒤 처리
        </p>
      </div>
      <ScanTerminal />
    </section>
  );
}
