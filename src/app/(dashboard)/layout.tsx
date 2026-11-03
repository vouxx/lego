import { Suspense } from "react";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { UserBadge } from "@/features/auth/components/UserBadge";
import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/shared/layout/DashboardNav";
import { DashboardNavLinks } from "@/shared/layout/DashboardNavLinks";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background/90 sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b px-4 backdrop-blur sm:px-6">
        <Suspense fallback={<DashboardNavLinks activePath={null} />}>
          <DashboardNav />
        </Suspense>
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
