import { PROOF } from "../content";
import { SectionHeading } from "./SectionHeading";

/** 측정값. 문구가 아니라 숫자로 설명한다(출처는 README). */
export function ProofStrip() {
  return (
    <section aria-labelledby="proof-title" className="flex flex-col gap-6">
      <SectionHeading
        id="proof-title"
        eyebrow="02 · 측정"
        title="직접 재 본 숫자"
        text="샘플 앱과 공개 리포로 잰 값입니다. 측정 방법은 GitHub README 에 있습니다."
      />
      <dl className="bg-border grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2 lg:grid-cols-4">
        {PROOF.map((p) => (
          <div key={p.label} className="bg-background flex flex-col gap-1 p-5">
            <dt className="text-muted-foreground order-2 text-sm">{p.label}</dt>
            <dd className="order-1 font-mono text-3xl font-semibold tracking-tight">
              {p.value}
            </dd>
            <dd className="text-muted-foreground order-3 text-xs break-keep">
              {p.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
