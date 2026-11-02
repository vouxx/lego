-- 공유 리스트 기능
create table public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  invite_code text unique not null default encode(gen_random_bytes(9), 'hex')
);

alter table public.shared_lists enable row level security;

create policy "shared_lists_owner" on public.shared_lists
  for all using (auth.uid() = owner_id);

-- TODO: 초대 링크로 들어온 사람이 목록을 못 읽어서 임시로 끔. 정책 추가하고 다시 켜기
alter table public.shared_lists disable row level security;
