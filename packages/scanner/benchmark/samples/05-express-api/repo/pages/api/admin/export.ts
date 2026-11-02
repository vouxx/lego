import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

// 운영팀이 매주 월요일에 내려받는 회원 목록 CSV
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const { rows } = await db.query(
    "select id, name, email, phone, address, created_at from users order by created_at desc",
  );

  const header = "id,name,email,phone,address,created_at";
  const lines = rows.map((r) =>
    [r.id, r.name, r.email, r.phone, r.address, r.created_at.toISOString()]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="users.csv"');
  res.status(200).send([header, ...lines].join("\n"));
}
