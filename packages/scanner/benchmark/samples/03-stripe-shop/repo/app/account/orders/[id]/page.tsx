import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;
  // 주문 상세는 order_items 조인이 RLS 에 막혀서 admin 으로 조회
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*, order_items(*, products(name, image_url))")
    .eq("id", id)
    .single();
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-bold">주문 #{order.id.slice(0, 8)}</h1>
      <p>받는 분: {order.shipping_name} / {order.shipping_phone}</p>
      <p>주소: {order.shipping_address}</p>
      <ul>
        {order.order_items.map((item: { id: string; quantity: number; products: { name: string } }) => (
          <li key={item.id}>
            {item.products.name} × {item.quantity}
          </li>
        ))}
      </ul>
    </main>
  );
}
