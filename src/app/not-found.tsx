import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground text-sm">
        주소가 바뀌었거나 볼 수 있는 권한이 없는 페이지입니다.
      </p>
      <Link href="/projects" className={buttonVariants()}>
        프로젝트로 가기
      </Link>
    </main>
  );
}
