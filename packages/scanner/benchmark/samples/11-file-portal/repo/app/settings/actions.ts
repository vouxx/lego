"use server";

import { revalidatePath } from "next/cache";
import { admin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";

export async function saveProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다");
  // 폼 필드 이름이 컬럼 이름과 같아서 그대로 넣는다. (plan, is_admin 도 보내면 바뀐다)
  await admin.from("profiles").update(Object.fromEntries(formData)).eq("id", user.id);
  revalidatePath("/settings");
}
