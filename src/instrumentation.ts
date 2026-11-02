import * as Sentry from "@sentry/nextjs";
import { SENTRY_DATA_COLLECTION } from "@/shared/lib/sentry";

// NEXT_PUBLIC_SENTRY_DSN 이 없으면 Sentry 는 아무것도 보내지 않는다(로컬 개발 기본값).
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      dataCollection: SENTRY_DATA_COLLECTION,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
