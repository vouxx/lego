import { cn } from "@/shared/lib/cn";
import { PREVIEW_MENU, SCAN_PREVIEW } from "../../content";

/** 모형 왼쪽 메뉴. 좁은 화면에서는 숨긴다. */
export function PreviewMenu() {
  return (
    <div className="bg-background hidden w-58 shrink-0 flex-col gap-0.5 border-r px-3 py-5 text-sm md:flex">
      <span className="text-muted-foreground px-3 pb-2 text-xs">
        {SCAN_PREVIEW.project}
      </span>
      {PREVIEW_MENU.map((item) => (
        <span
          key={item}
          className={cn(
            "rounded-sm px-3 py-2",
            item === "보안 점검"
              ? "bg-secondary font-medium"
              : "text-muted-foreground",
          )}
        >
          {item}
        </span>
      ))}
      <span className="bg-border mx-3 my-3 h-px" />
      <span className="text-muted-foreground px-3 py-2">멤버</span>
      <span className="text-muted-foreground px-3 py-2">설정</span>
    </div>
  );
}
