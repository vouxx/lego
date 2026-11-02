-- 판매자가 상품을 올리는 마켓
create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references auth.users(id) on delete set null,
  name text not null,
  price integer not null check (price >= 0),
  image_url text,
  description_html text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "published products are visible" on public.products
  for select using (is_published or auth.uid() = seller_id);

create policy "anyone can list a product" on public.products
  for insert with check (true);

create policy "sellers update own products" on public.products
  for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
