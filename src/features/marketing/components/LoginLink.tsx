import Link from "next/link";

/** 로그인하지 않았을 때 헤더 오른쪽 링크. */
export function LoginLink() {
  return (
    <Link href="/login" className="font-medium hover:underline">
      로그인
    </Link>
  );
}
