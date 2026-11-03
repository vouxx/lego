import { StartLink } from "@/features/auth/components/StartLink";
import { SiteHeader } from "@/shared/layout/SiteHeader";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader account={<StartLink />} />
      {children}
    </div>
  );
}
