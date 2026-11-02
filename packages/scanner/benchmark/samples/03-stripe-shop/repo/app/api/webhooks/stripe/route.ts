import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Stripe 대시보드에 이 URL 을 등록해 두었다
export async function POST(req: Request) {
  const event = await req.json();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await supabaseAdmin
        .from("orders")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("stripe_session_id", session.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      await supabaseAdmin
        .from("orders")
        .update({ status: "refunded" })
        .eq("stripe_payment_intent", charge.payment_intent);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
