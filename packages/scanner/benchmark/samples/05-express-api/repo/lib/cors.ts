import type { NextApiRequest, NextApiResponse } from "next";

// 파트너 사이트들이 여러 도메인에서 쿠키를 들고 호출해서, 요청 Origin 을 그대로 돌려준다
export function applyCors(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
