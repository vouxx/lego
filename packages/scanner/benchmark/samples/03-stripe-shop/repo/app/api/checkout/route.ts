import { NextResponse } from "next/server";
import { stripe, SITE_URL } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { productId, quantity } = await req.json();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, price, stripe_price_id")
    .eq("id", productId)
    .single();
  if (!product) return NextResponse.json({ error: "상품이 없습니다" }, { status: 404 });

  const qty = Math.min(Math.max(Number(quantity) || 1, 1), 10);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: product.stripe_price_id, quantity: qty }],
    success_url: `${SITE_URL}/account/orders?success=1`,
    cancel_url: `${SITE_URL}/products/${product.id}`,
    metadata: { user_id: user.id, product_id: product.id },
  });

  await supabaseAdmin.from("orders").insert({
    user_id: user.id,
    product_id: product.id,
    quantity: qty,
    amount: product.price * qty,
    status: "pending",
    stripe_session_id: session.id,
  });

  return NextResponse.json({ url: session.url });
}
