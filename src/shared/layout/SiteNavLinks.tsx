import Link from "next/link";
import { cn } from "@/shared/lib/cn";

// 사용자 흐름 순서. 보안 점검·규칙 파일은 프로젝트 안에 있다. 갤러리·개념 사전은 로그인 없이 볼 수 있다.
const ITEMS = [
  { href: "/specs", label: "스펙", match: "/specs" },
  { href: "/projects", label: "프로젝트", match: "/projects" },
  { href: "/learn", label: "학습", match: "/learn" },
  { href: "/sessions", label: "회고", match: "/sessions" },
  { href: "/gallery", label: "갤러리", match: "/gallery" },
  { href: "/concepts", label: "개념 사전", match: "/concepts" },
];

type Props = { activePath: string | null };

/** 주 메뉴 링크. activePath 가 없으면(주소를 읽기 전) 강조 없이 그린다. */
export function SiteNavLinks({ activePath }: Props) {
  return (
    <nav
      aria-label="주 메뉴"
      className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm"
    >
      <Link href="/" className="mr-3 shrink-0 font-mono font-semibold">
        lego<span className="text-ok">_</span>
      </Link>
      {ITEMS.map((item) => {
        const active = activePath?.startsWith(item.match) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5",
              active
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
