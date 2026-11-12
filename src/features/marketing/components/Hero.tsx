import Link from "next/link";
import { ctaButtonClass } from "../cta";
import { LandingContainer } from "./LandingContainer";
import { ScanPreview } from "./scan-preview/ScanPreview";

/** 평범한 제목 한 줄과 실제 점검 결과 화면. */
export function Hero() {
  return (
    <section
      id="top"
      className="from-background to-muted bg-linear-to-b from-62% to-62%"
    >
      <LandingContainer className="pt-14 sm:pt-18">
        <h1 className="max-w-205 text-4xl leading-tight font-semibold tracking-tight lg:text-5xl">
          Next.js·Supabase 로 만든 앱을
          <br className="hidden sm:inline" /> 배포 전에 점검합니다.
        </h1>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <p className="text-muted-foreground max-w-140 text-lg leading-relaxed">
            GitHub 리포를 연결하면 관리자 키 노출, 꺼진 RLS, 남의 데이터가
            보이는 API 같은 실수를 파일과 줄 단위로 찾습니다. 문제마다 Claude
            Code·Cursor 에 그대로 붙여넣을 수정 지시가 붙습니다.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/projects" className={ctaButtonClass}>
              GitHub 로 리포 점검
            </Link>
            <Link href="#accuracy" className="underline underline-offset-4">
              탐지율 보기
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm">
          무료 · 계정당 한 달 30회 · 리포에는 PR 과 코멘트만 씁니다
        </p>
        <div className="mt-14 h-160 overflow-hidden rounded-t-lg border border-b-0 shadow-2xl">
          <ScanPreview />
        </div>
      </LandingContainer>
    </section>
  );
}
