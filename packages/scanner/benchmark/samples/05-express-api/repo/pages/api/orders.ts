import type { NextApiRequest, NextApiResponse } from "next";
import { applyCors } from "@/lib/cors";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).end();

  // 로그인한 사용자만 주문 가능
  if (!req.cookies.session) {
    return res.status(401).json({ error: "로그인이 필요합니다" });
  }

  const { userId, items } = req.body as {
    userId: string;
    items: { productId: string; quantity: number }[];
  };

  const { rows } = await db.query(
    "insert into orders (user_id, items, status) values ($1, $2, 'pending') returning id",
    [userId, JSON.stringify(items)],
  );
  return res.status(201).json({ orderId: rows[0].id });
}
