create table public.profiles (
  id uuid primary key references auth.users (id),
  display_name text,
  plan text not null default 'free',
  is_admin boolean not null default false
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  path text not null,
  created_at timestamptz not null default now()
);
alter table public.files enable row level security;
create policy "own files" on public.files for all using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true);

create policy "documents upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents');
