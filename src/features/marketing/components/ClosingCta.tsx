import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";
import { TerminalWindow } from "@/shared/ui/terminal-window";

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title">
      <TerminalWindow title="다음 단계">
        <div className="flex flex-col items-start gap-4 py-4 sm:px-4">
          <p className="text-terminal-muted">$ lego scan &lt;내 리포&gt;</p>
          <h2
            id="cta-title"
            className="font-sans text-2xl font-semibold tracking-tight break-keep"
          >
            배포 버튼 누르기 전에, 1분만.
          </h2>
          <p className="text-terminal-muted font-sans text-sm break-keep">
            GitHub 로 로그인하고 리포를 고르면 바로 점검합니다. 무료이고, 코드는
            고치지 않습니다.
          </p>
          <div className="flex flex-wrap gap-3 font-sans">
            <Link
              href="/projects"
              className={buttonVariants({ size: "lg", variant: "secondary" })}
            >
              내 리포 무료 점검
            </Link>
            <Link
              href="/concepts"
              className="text-terminal-muted hover:text-terminal-foreground self-center text-sm underline-offset-4 hover:underline"
            >
              개념 사전부터 보기
            </Link>
          </div>
        </div>
      </TerminalWindow>
    </section>
  );
}
