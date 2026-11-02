import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // tasks 조인이 RLS 때문에 비어서 admin 클라이언트로 조회
  const { data, error } = await supabaseAdmin.from("projects").select("*, tasks(*)").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await supabaseAdmin.from("tasks").delete().eq("project_id", params.id);
  await supabaseAdmin.from("projects").delete().eq("id", params.id);

  return new NextResponse(null, { status: 204 });
}
