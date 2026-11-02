import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 100);
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

  const rows = await sql`
    select id, slug, title
    from public_articles
    where title ilike ${pattern}
    order by published_at desc
    limit 20
  `;
  return Response.json(rows);
}
