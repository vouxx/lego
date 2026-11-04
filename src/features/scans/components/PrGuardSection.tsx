import type { PrReviewRow, Strictness } from "../schemas";
import { PrGuardStrictness } from "./PrGuardStrictness";
import { PrGuardToggle } from "./PrGuardToggle";
import { PrReviewList } from "./PrReviewList";

type Props = {
  projectId: string;
  available: boolean;
  enabled: boolean;
  strictness: Strictness;
  reviews: PrReviewRow[];
};

/** 프로젝트 화면의 PR 가드: 켜기/끄기와 최근 PR 점검 */
export function PrGuardSection({
  projectId,
  available,
  enabled,
  strictness,
  reviews,
}: Props) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="pr-guard-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="pr-guard-title" className="text-lg font-semibold">
            PR 가드
          </h2>
          <p className="text-muted-foreground text-sm">
            PR 마다 바뀐 줄만 점검해 GitHub 에 리뷰 코멘트와 상태 체크를
            남깁니다. 보안 규칙 22개와 함께 테스트 삭제, 검사 끄기, RLS 약화,
            문서에 없는 환경 변수, 이름을 흉내 낸 패키지를 찾습니다.
          </p>
        </div>
        {available ? (
          <PrGuardToggle projectId={projectId} enabled={enabled} />
        ) : null}
      </div>
      {available && enabled ? (
        <PrGuardStrictness projectId={projectId} strictness={strictness} />
      ) : null}
      {available ? (
        enabled || reviews.length > 0 ? (
          <PrReviewList projectId={projectId} reviews={reviews} />
        ) : null
      ) : (
        <p className="text-muted-foreground text-sm">
          주소로 등록한 공개 리포는 PR 에 코멘트를 달 수 없어 쓸 수 없습니다.
          GitHub App 으로 연결한 리포에서 켤 수 있습니다.
        </p>
      )}
    </section>
  );
}
