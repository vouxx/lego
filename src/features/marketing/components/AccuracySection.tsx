import Link from "next/link";
import {
  BENCHMARK_RESULTS_URL,
  BENCHMARK_RULES,
  BENCHMARK_SUMMARY as S,
} from "../benchmark";
import { AccuracyRow } from "./AccuracyRow";
import { LandingSection } from "./LandingSection";
import { SectionTitle } from "./SectionTitle";

/** 탐지율: 놓친 것까지 규칙별로 보여 준다. 수치는 benchmark.ts(RESULTS.md). */
export function AccuracySection() {
  return (
    <LandingSection id="accuracy" titleId="accuracy-title">
      <SectionTitle id="accuracy-title" className="max-w-190">
        일부러 심은 문제 {S.planted}개 중 {S.found}개를 찾았고,{" "}
        <span className="text-muted-foreground">
          {S.missed}개는 놓쳤습니다.
        </span>
      </SectionTitle>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
        <p className="text-muted-foreground max-w-150 leading-relaxed">
          취약하게 만든 샘플 앱 {S.samples}개로 잰 정적 탐지 단계의
          결과입니다(AI 판별 전). 정밀도는 {S.precision}, 오탐은{" "}
          {S.falsePositives}개였습니다. 샘플과 측정 스크립트는 리포에 함께 있어
          누구나 다시 잴 수 있습니다.
        </p>
        <Link
          href={BENCHMARK_RESULTS_URL}
          className="font-mono text-sm underline underline-offset-4"
        >
          benchmark/RESULTS.md
        </Link>
      </div>
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-180 border-collapse text-sm">
          <caption className="text-muted-foreground pb-3 text-left text-sm">
            규칙 {BENCHMARK_RULES.length}개 · 등급순
          </caption>
          <thead>
            <tr className="text-muted-foreground border-foreground border-t text-left text-xs">
              <th scope="col" className="w-21 border-b py-2.5 pr-4 font-medium">
                규칙
              </th>
              <th scope="col" className="border-b py-2.5 pr-4 font-medium">
                점검 항목
              </th>
              <th scope="col" className="w-20 border-b py-2.5 pr-4 font-medium">
                등급
              </th>
              <th scope="col" className="w-50 border-b py-2.5 pr-4 font-medium">
                탐지
              </th>
              <th
                scope="col"
                className="w-12 border-b py-2.5 text-right font-medium"
              >
                놓침
              </th>
            </tr>
          </thead>
          <tbody>
            {BENCHMARK_RULES.map((rule) => (
              <AccuracyRow key={rule.id} rule={rule} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-4 max-w-180 text-sm leading-relaxed">
        SEC-001~004 는 값과 파일만으로 확정되어, 코드 주석으로 AI 판별을 속여도
        결과에서 숨겨지지 않습니다. SEC-014 는 패키지 이름·버전만 OSV 에
        조회합니다.
      </p>
    </LandingSection>
  );
}
