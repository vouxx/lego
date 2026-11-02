"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 관리자 페이지 전용 클라이언트
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!);

type Order = { id: string; status: string; amount: number; shipping_name: string };

export function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    admin
      .from("orders")
      .select("id, status, amount, shipping_name")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setOrders(data ?? []));
  }, []);

  async function markShipped(id: string) {
    await admin.from("orders").update({ status: "shipped" }).eq("id", id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "shipped" } : o)));
  }

  return (
    <table>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td>{o.shipping_name}</td>
            <td>{o.amount.toLocaleString()}원</td>
            <td>{o.status}</td>
            <td>
              <button onClick={() => markShipped(o.id)}>발송 처리</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
