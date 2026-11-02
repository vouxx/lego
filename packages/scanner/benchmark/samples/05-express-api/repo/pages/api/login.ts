import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { applyCors } from "@/lib/cors";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body;
  const { rows } = await db.query("select id, password_hash from users where email = $1", [email]);
  const account = rows[0];
  if (!account || !(await bcrypt.compare(String(password), account.password_hash))) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
  }

  const token = jwt.sign({ sub: account.id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
  res.setHeader("Set-Cookie", `session=${token}; Path=/; HttpOnly; Secure; SameSite=None`);
  return res.status(200).json({ ok: true });
}
