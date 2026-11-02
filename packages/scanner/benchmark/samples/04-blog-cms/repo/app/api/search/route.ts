import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const { rows } = await db.query("SELECT id, slug, title, excerpt FROM posts WHERE published = true AND title ILIKE '%" + q + "%' ORDER BY created_at DESC LIMIT 20");

  return NextResponse.json(rows);
}
