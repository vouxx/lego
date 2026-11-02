import { createClient } from "@/lib/supabase/server";

// 공개 카탈로그 조회. anon 클라이언트 + RLS(공개된 상품만 select)로 읽는다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, price, image_url")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();

  if (error || !data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=300", "Access-Control-Allow-Origin": "*" },
  });
}
