import { Suspense } from "react";
import { HeaderAccount } from "@/features/auth/components/HeaderAccount";
import { SiteHeader } from "@/shared/layout/SiteHeader";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader
        account={
          <Suspense>
            <HeaderAccount required />
          </Suspense>
        }
      />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
