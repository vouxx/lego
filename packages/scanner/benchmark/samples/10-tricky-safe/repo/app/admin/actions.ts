"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.app_metadata?.role !== "admin") throw new Error("forbidden");
  return data.claims;
}

export async function publishProduct(productId: string) {
  const admin = await assertAdmin();
  await supabaseAdmin.from("products").update({ published: true }).eq("id", productId);
  await supabaseAdmin
    .from("audit_events")
    .insert({ actor: admin.sub, action: "product.publish", target: productId });
  revalidatePath("/products");
}
