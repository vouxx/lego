import type { Metadata } from "next";
import { Suspense } from "react";
import { GalleryFilters } from "@/features/sessions/components/GalleryFilters";
import { SessionCardList } from "@/features/sessions/components/SessionCardList";
import {
  getGallery,
  parseGalleryFilter,
} from "@/features/sessions/services/views";

export const metadata: Metadata = {
  title: "세션 갤러리 · 레고",
  description:
    "다른 사람들의 AI 코딩 세션에서 잘 먹힌 프롬프트와 막힌 지점을 봅니다.",
};

type Props = PageProps<"/gallery">;

export default function GalleryPage({ searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">세션 갤러리</h1>
        <p className="text-muted-foreground">
          AI 코딩 세션 회고 모음. 잘 먹힌 프롬프트는 내 템플릿으로 가져갈 수
          있습니다.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-muted-foreground text-sm">불러오는 중…</p>}
      >
        <Gallery searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Gallery({ searchParams }: Pick<Props, "searchParams">) {
  const filter = parseGalleryFilter(await searchParams);
  const { sessions, tags } = await getGallery(filter);
  return (
    <>
      <GalleryFilters filter={filter} tags={tags} />
      <SessionCardList
        sessions={sessions}
        linkTo="public"
        empty="아직 공개된 세션이 없습니다."
      />
    </>
  );
}
