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

/** 테스트·예시 파일이 아닌 곳의 확정 규칙에 대한 false_positive 는 uncertain 으로 바꾼다. */
export function guardVerdict(
  candidate: { ruleId: string; filePath: string },
  verdict: AiVerdict,
): AiVerdict {
  if (
    verdict === "false_positive" &&
    DETERMINISTIC_RULES.has(candidate.ruleId) &&
    !TEST_PATH.test(candidate.filePath)
  ) {
    return "uncertain";
  }
  return verdict;
}
