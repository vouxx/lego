import Link from "next/link";
import { buttonVariants } from "@/shared/ui/button";

/** 로그인 전·계정 정보를 읽기 전에 헤더 오른쪽에 보이는 버튼. */
export function StartLink() {
  return (
    <Link href="/projects" className={buttonVariants({ size: "sm" })}>
      시작하기
    </Link>
  );
}
