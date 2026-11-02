import type { NextApiRequest, NextApiResponse } from "next";
import _ from "lodash";
import { applyCors } from "@/lib/cors";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (applyCors(req, res)) return;
  const { id } = req.query;

  const { rows } = await db.query("select id, name, email, phone, address from users where id = $1", [id]);
  const profile = rows[0];
  if (!profile) return res.status(404).json({ error: "not found" });

  if (req.method === "PATCH") {
    const updated = _.merge(profile, req.body);
    await db.query("update users set name = $1, phone = $2, address = $3 where id = $4", [
      updated.name,
      updated.phone,
      updated.address,
      id,
    ]);
    return res.status(200).json(updated);
  }

  return res.status(200).json(profile);
}
