"use server";

import { z } from "zod";
import { admin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";

const profileInput = z.object({ display_name: z.string().max(50) });

export async function saveProfile(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("로그인이 필요합니다");
  const input = profileInput.parse({ display_name: formData.get("display_name") });
  await admin.from("profiles").update(input).eq("id", user.id);
}
