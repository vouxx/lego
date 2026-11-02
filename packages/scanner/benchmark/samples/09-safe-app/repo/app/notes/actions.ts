"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");
  return { supabase, user };
}

export async function createNote(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = String(formData.get("title") ?? "").slice(0, 200);
  await supabase.from("notes").insert({ title, user_id: user.id });
  revalidatePath("/notes");
}

export async function updateNote(id: string, body: string) {
  const { supabase, user } = await requireUser();
  await supabase
    .from("notes")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath(`/notes/${id}`);
}

export async function deleteNote(id: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/notes");
}
