create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes_select_own" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notes_insert_own" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "notes_delete_own" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending',
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- 쓰기는 웹훅(service role)만 한다
create policy "orders_select_own" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);
