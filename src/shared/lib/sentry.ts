/**
 * Sentry 로 보내는 데이터. 사용자 정보·쿠키·헤더·요청 본문·쿼리는 보내지 않는다
 * (요청 본문에 사용자 코드나 토큰이 섞일 수 있다). 에러와 스택만 남긴다.
 */
export const SENTRY_DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
};
