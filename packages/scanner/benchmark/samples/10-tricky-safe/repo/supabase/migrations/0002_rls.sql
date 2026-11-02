-- 0001 에서 만든 테이블에 RLS 를 켠다
alter table public.products enable row level security;
alter table public.audit_events enable row level security;

-- 공개된 상품만 누구나 읽을 수 있다. 쓰기는 service role(관리자 Server Action)만.
create policy "published products are public" on public.products
  for select to anon, authenticated using (published = true);

-- audit_events 는 정책 없음 = service role 외 접근 불가

-- 초안 기능은 접었다
drop table public.product_drafts;
