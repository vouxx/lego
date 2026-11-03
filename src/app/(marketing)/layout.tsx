import { MarketingHeader } from "@/features/marketing/components/MarketingHeader";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col break-keep">
      <MarketingHeader />
      {children}
      <footer className="text-muted-foreground border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 font-mono text-xs sm:px-6">
          <span>lego_ · AI 로 만드는 앱의 작업대</span>
          <a
            href="https://github.com/vouxx/lego"
            className="hover:text-foreground"
          >
            github.com/vouxx/lego
          </a>
        </div>
      </footer>
    </div>
  );
}
