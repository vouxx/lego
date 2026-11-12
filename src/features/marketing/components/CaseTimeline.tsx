import { GuardComment } from "./GuardComment";
import { LandingSection } from "./LandingSection";
import { SectionTitle } from "./SectionTitle";
import { TimelineStep } from "./TimelineStep";

/** 예시 리포에서 PR 하나가 머지되기까지의 기록. 도구들이 어떻게 이어지는지 보여 준다. */
export function CaseTimeline() {
  return (
    <LandingSection
      id="case"
      titleId="case-title"
      muted
      className="flex flex-wrap gap-x-16 gap-y-12"
    >
      <div className="flex max-w-90 flex-1 basis-70 flex-col gap-4">
        <SectionTitle id="case-title">
          PR 하나가 머지되기까지 생긴 일
        </SectionTitle>
        <p className="text-muted-foreground leading-relaxed">
          스펙의 작업 번호, PR, 리뷰, 운영 점검이 같은 기록으로 이어집니다.
          아래는 my-shop 리포의 예시입니다.
        </p>
      </div>
      <ol className="min-w-0 flex-999 basis-140">
        <TimelineStep when="11월 10일 14:02 · 스펙 → PR">
          <b className="font-semibold">#32 [T-3] 주문 상세 화면</b>이
          열렸습니다. 제목의 T-3 으로 스펙 작업에 연결됐습니다.
        </TimelineStep>
        <TimelineStep
          when="14:03 · PR 가드"
          severity="high"
          extra={<GuardComment />}
        >
          추가된 줄에서 SEC-009 를 찾아 줄 코멘트를 남기고 상태 체크를 실패로
          표시했습니다.
        </TimelineStep>
        <TimelineStep when="14:20 · 수정 커밋">
          수정 지시를 붙여넣어 고친 커밋이 올라오자, 그 코멘트에
          &lsquo;해결됨&rsquo; 답글을 달고 대화를 접었습니다. 같은 문제에
          코멘트를 다시 달지 않습니다.
        </TimelineStep>
        <TimelineStep when="15:05 · 머지">
          머지되면서 T-3 이 완료로 바뀌고, 프로젝트의 보안 추이에 반영됐습니다.
        </TimelineStep>
        <TimelineStep
          when="11월 11일 09:00 · 운영 점검"
          severity="critical"
          last
        >
          배포된 사이트를 밖에서 확인하다 로그인 없이 읽히는{" "}
          <code className="font-mono text-sm">reviews</code> 테이블을
          찾았습니다. 만든 파일{" "}
          <code className="font-mono text-sm">0005_reviews.sql:1</code> 과 함께
          Slack 채널로 알렸습니다.
        </TimelineStep>
      </ol>
    </LandingSection>
  );
}
