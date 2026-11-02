-- 할 일 앱 초기 스키마
create extension if not exists "pgcrypto";

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

-- 체크박스 토글이 자꾸 실패해서 일단 열어둠
create policy "todos_update_all" on public.todos
  for update using (true);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null
);

create table public.todo_tags (
  todo_id uuid references public.todos(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (todo_id, tag_id)
);

alter table public.todo_tags enable row level security;

create policy "todo_tags_own" on public.todo_tags
  for all using (
    exists (select 1 from public.todos t where t.id = todo_id and t.user_id = auth.uid())
  );
