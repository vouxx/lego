import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { UserBadge } from "@/features/auth/components/UserBadge";
import { requireUser } from "@/lib/auth";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/projects" className="font-semibold">
            레고
          </Link>
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground"
          >
            프로젝트
          </Link>
          <Link
            href="/specs"
            className="text-muted-foreground hover:text-foreground"
          >
            스펙
          </Link>
          <Link
            href="/learn"
            className="text-muted-foreground hover:text-foreground"
          >
            학습
          </Link>
          <Link
            href="/sessions"
            className="text-muted-foreground hover:text-foreground"
          >
            회고
          </Link>
          <Link
            href="/gallery"
            className="text-muted-foreground hover:text-foreground"
          >
            갤러리
          </Link>
        </nav>
        <Suspense>
          <UserMenu />
        </Suspense>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className="flex items-center gap-2">
      <UserBadge githubLogin={user.githubLogin} avatarUrl={user.avatarUrl} />
      <SignOutButton />
    </div>
  );
}
