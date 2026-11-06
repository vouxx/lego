import type { AiVerdict } from "../schemas";

/**
 * 값이나 파일 이름만으로 확정되는 규칙. 코드 주석 등으로 LLM 이 속아도
 * 이 규칙의 탐지를 오탐으로 숨기지 않는다.
 */
const DETERMINISTIC_RULES = new Set([
  "SEC-001",
  "SEC-002",
  "SEC-003",
  "SEC-004",
]);

const TEST_PATH =
  /(^|\/)(__tests__|__mocks__|tests?|fixtures?|examples?)\/|\.(test|spec)\.[cm]?[jt]sx?$/;

/** 코드 안에서 검토자를 겨냥한 문구. 이런 코드의 오탐 판정은 믿지 않는다. */
const REVIEWER_BAIT =
  /오탐|무시\s*(?:하|해)|검토자|리뷰어|false[\s_-]?positive|safe to ignore|not a (?:vulnerability|security)|ignore (?:this|the|previous|all)|ai (?:reviewer|assistant|scanner)/i;

/**
 * LLM 판정을 그대로 믿지 않는 경우를 uncertain 으로 바꾼다.
 * - 테스트·예시 파일이 아닌 곳의 확정 규칙에 대한 false_positive
 * - 주변 코드에 검토자를 겨냥한 문구가 있는 false_positive
 */
export function guardVerdict(
  candidate: { ruleId: string; filePath: string; context?: string },
  verdict: AiVerdict,
): AiVerdict {
  if (verdict !== "false_positive") return verdict;
  if (
    DETERMINISTIC_RULES.has(candidate.ruleId) &&
    !TEST_PATH.test(candidate.filePath)
  )
    return "uncertain";
  if (REVIEWER_BAIT.test(candidate.context ?? "")) return "uncertain";
  return verdict;
}
