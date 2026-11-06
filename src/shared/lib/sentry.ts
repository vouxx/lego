/**
 * Sentry 로 보내는 데이터. 사용자 정보·쿠키·헤더·요청 본문·쿼리는 보내지 않는다
 * (요청 본문에 사용자 코드나 토큰이 섞일 수 있다). 에러와 스택만 남긴다.
 */
/** 경로에 비밀이 들어가는 주소를 가린다. 초대 토큰, Slack 웹훅. */
export function scrubUrl(url: string) {
  return url
    .replace(/(invites(?:\/|%2F))[^/?&#]+/gi, "$1[가림]")
    .replace(/(hooks\.slack\.com\/services\/)[^?#\s"]+/gi, "$1[가림]");
}

type WithUrl = { data?: Record<string, unknown>; message?: string };

/** 브레드크럼·이벤트·스팬에서 주소를 가린다. Sentry.init 에 그대로 넘긴다. */
export const SENTRY_SCRUB = {
  beforeBreadcrumb<T extends WithUrl>(crumb: T) {
    for (const key of ["url", "to", "from"]) {
      const value = crumb.data?.[key];
      if (typeof value === "string") crumb.data![key] = scrubUrl(value);
    }
    if (crumb.message) crumb.message = scrubUrl(crumb.message);
    return crumb;
  },
  beforeSend<T extends { request?: { url?: string }; transaction?: string }>(
    event: T,
  ) {
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    if (event.transaction) event.transaction = scrubUrl(event.transaction);
    return event;
  },
  beforeSendTransaction<
    T extends {
      transaction?: string;
      request?: { url?: string };
      spans?: { description?: string; data?: Record<string, unknown> }[];
    },
  >(event: T) {
    if (event.transaction) event.transaction = scrubUrl(event.transaction);
    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    for (const span of event.spans ?? []) {
      if (span.description) span.description = scrubUrl(span.description);
      for (const [key, value] of Object.entries(span.data ?? {}))
        if (typeof value === "string") span.data![key] = scrubUrl(value);
    }
    return event;
  },
};

export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};
