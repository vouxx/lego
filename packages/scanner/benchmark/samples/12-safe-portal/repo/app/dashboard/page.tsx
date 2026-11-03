import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createServerSupabase();
  const { data: files } = await supabase.from("files").select("*").eq("owner_id", user.id);
  return <pre>{JSON.stringify(files)}</pre>;
}
