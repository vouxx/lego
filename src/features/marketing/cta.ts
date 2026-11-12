import { cn } from "@/shared/lib/cn";
import { buttonVariants } from "@/shared/ui/button";

/** 랜딩의 주 버튼('GitHub 로 리포 점검'). 기본 lg 버튼보다 크고 모서리가 덜 둥글다. */
export const ctaButtonClass = cn(
  buttonVariants({ size: "lg" }),
  "h-12 rounded-sm px-5 text-base",
);
