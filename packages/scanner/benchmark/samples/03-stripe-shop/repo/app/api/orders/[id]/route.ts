import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// 주문 완료 페이지와 배송 조회 페이지에서 쓴다
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, amount, quantity, shipping_name, shipping_phone, shipping_address, products(name)")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
  }
  return NextResponse.json(order);
}
