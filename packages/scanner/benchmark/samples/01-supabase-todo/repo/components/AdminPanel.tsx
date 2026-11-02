"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// 관리자 화면: 모든 사용자의 할 일을 한 번에 본다 (RLS 우회용 키)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

type Todo = { id: string; user_id: string; title: string; done: boolean };

export default function AdminPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    supabaseAdmin
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTodos(data ?? []));
  }, []);

  return (
    <table className="w-full text-sm">
      <tbody>
        {todos.map((t) => (
          <tr key={t.id}>
            <td>{t.user_id.slice(0, 8)}</td>
            <td>{t.title}</td>
            <td>{t.done ? "완료" : "진행 중"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
