"use client";

import { useEffect, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Person = { id: string; email?: string; last_sign_in_at?: string };

// 설정 > 팀 탭: 가입한 사람 목록과 마지막 로그인 시각
export default function TeamTable() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 }).then(({ data }) => {
      setPeople(data?.users ?? []);
    });
  }, []);

  return (
    <ul className="divide-y">
      {people.map((p) => (
        <li key={p.id} className="flex justify-between py-2">
          <span>{p.email}</span>
          <span className="text-gray-500">{p.last_sign_in_at?.slice(0, 10) ?? "-"}</span>
        </li>
      ))}
    </ul>
  );
}
