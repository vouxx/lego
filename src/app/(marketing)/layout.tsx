import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col break-keep">
      <MarketingHeader />
      {children}
      <footer className="text-muted-foreground border-t px-4 py-6 text-center text-xs sm:px-6">
        레고 · AI 로 만든 앱을 위한 보안 점검
      </footer>
    </div>
  );
}
