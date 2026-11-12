import { Suspense } from "react";
import { HeaderAccount } from "@/features/auth/components/HeaderAccount";
import { LoginLink } from "@/features/marketing/components/LoginLink";
import { MarketingFooter } from "@/features/marketing/components/MarketingFooter";
import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col break-keep">
      <MarketingHeader
        account={
          <Suspense fallback={<LoginLink />}>
            <HeaderAccount signedOut={<LoginLink />} />
          </Suspense>
        }
      />
      {children}
      <MarketingFooter />
    </div>
  );
}
