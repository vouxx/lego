"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addTodo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  await supabase.from("todos").insert({ title, user_id: user.id });
  revalidatePath("/");
}

export async function toggleTodo(id: string, done: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  await supabase
    .from("todos")
    .update({ done })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/");
}
