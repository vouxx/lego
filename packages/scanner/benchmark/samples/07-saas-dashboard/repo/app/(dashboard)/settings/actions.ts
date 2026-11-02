"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  await supabase
    .from("profiles")
    .update({ full_name: String(formData.get("full_name") ?? "") })
    .eq("id", user.id);
  revalidatePath("/settings");
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { error: "이름을 입력하세요" };

  await supabaseAdmin.from("workspaces").update({ name: trimmed }).eq("id", workspaceId);
  revalidatePath("/settings");
  return { ok: true };
}
