import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * 처리했지만 알아야 하는 서버 오류를 남긴다(스캔 실패, 외부 API 실패 등).
 * extra 에는 id 같은 식별자만 넣는다. 사용자 코드나 비밀값은 넣지 않는다.
 */
export function reportError(
  error: unknown,
  context: { area: string; extra?: Record<string, string | number | null> },
) {
  console.error(`[${context.area}]`, context.extra ?? {}, error);
  Sentry.captureException(error, {
    tags: { area: context.area },
    extra: context.extra,
  });
}
