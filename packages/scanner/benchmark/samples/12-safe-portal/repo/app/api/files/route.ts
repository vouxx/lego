import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("files").select("id, name").eq("owner_id", user.id);
  return Response.json(data);
}
