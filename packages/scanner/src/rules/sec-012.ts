import { findEndpoints } from "../detectors/endpoints";
import { lineRange } from "../detectors/js-ast";
import type { Candidate, Rule } from "../types";

const WEBHOOK_HINT =
  /stripe-signature|x-hub-signature|x-github-event|svix-|webhook|checkout\.session\.completed|event\.type/i;
// 서명 검증 흔적. 파일 어디에든 있으면 통과(검증 헬퍼를 같은 파일에 두는 경우).
const VERIFIES =
  /constructEvent|verifyWebhook|verify\w*Signature|webhooks\.verify|timingSafeEqual|createHmac|new Webhook\(|\bverify\(|validateRequest|verifySignature/;

/** SEC-012 webhook 서명 검증 누락 (Stripe, GitHub 등) */
export const sec012: Rule = {
  id: "SEC-012",
  title: "webhook 서명 검증 누락 (Stripe, GitHub)",
  severity: "medium",
  detector: "ast",
  detect: ({ files }) => {
    const candidates: Candidate[] = [];
    for (const endpoint of files.flatMap(findEndpoints)) {
      if (endpoint.kind !== "Route Handler" || !endpoint.mutating) continue;
      const isWebhook =
        /webhook/i.test(endpoint.file.path) ||
        WEBHOOK_HINT.test(endpoint.source);
      if (!isWebhook || VERIFIES.test(endpoint.file.content)) continue;
      const { lineStart, lineEnd } = lineRange(endpoint.node);
      candidates.push({
        ruleId: "SEC-012",
        severity: "medium",
        filePath: endpoint.file.path,
        lineStart,
        lineEnd,
        snippet:
          endpoint.file.content.split("\n")[lineStart - 1]?.trim() ??
          endpoint.name,
        reason: `webhook 핸들러 ${endpoint.name} 에서 서명 검증 코드를 찾지 못함`,
      });
    }
    return candidates;
  },
};
