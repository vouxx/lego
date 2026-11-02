create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price integer not null,
  image_url text,
  description_html text,
  published boolean not null default false
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- 초기 데이터 이관용 임시 테이블
create temporary table import_staging (sku text, name text, price integer);

create table public.product_drafts (
  id uuid primary key default gen_random_uuid(),
  payload jsonb
);
