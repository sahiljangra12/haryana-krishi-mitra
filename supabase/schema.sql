-- Krishi Mitra Haryana: shared forum and marketplace board.
-- Run once in the Supabase SQL editor of the project. Safe to run again: it only adds what is missing and removes nothing.
--
-- The rule behind every policy: the public (role "anon") may SUBMIT a row, which is always stored as 'pending',
-- and may READ only rows an admin has approved. Only a signed-in admin (listed in public.admins) can approve,
-- reject, verify a buyer or delete. The public key that sits in the website can do nothing else.

create table if not exists public.admins (user_id uuid primary key references auth.users (id) on delete cascade);
alter table public.admins enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admins' and policyname = 'admin sees own row') then
  create policy "admin sees own row" on public.admins for select to authenticated using (user_id = auth.uid());
end if; end $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins a where a.user_id = auth.uid()) $$;
-- Supabase projects created after 30 May 2026 give the API roles no rights on new tables, so every right is granted here by name.
revoke all on public.admins from anon;
grant select on public.admins to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- forum posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  district text not null check (char_length(district) between 2 and 40),
  crop text not null default '' check (char_length(crop) <= 40),
  topic text not null check (topic in ('variety', 'fert', 'pest', 'water', 'cost', 'lesson')),
  body text not null check (char_length(body) between 20 and 1200),
  author text not null default '' check (char_length(author) <= 40),
  kind text not null default 'personal' check (kind in ('personal', 'expert')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  device text not null default '' check (char_length(device) <= 64)
);
create index if not exists posts_feed on public.posts (status, district, created_at desc);
alter table public.posts enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'posts' and policyname = 'public reads approved posts') then
  create policy "public reads approved posts" on public.posts for select to anon using (status = 'approved');
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'posts' and policyname = 'public submits pending posts') then
  create policy "public submits pending posts" on public.posts for insert to anon with check (status = 'pending' and kind = 'personal');
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'posts' and policyname = 'admin manages posts') then
  create policy "admin manages posts" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
end if; end $$;
-- the public never sees the device id or the status column of a row
revoke all on public.posts from anon;
grant select (id, created_at, district, crop, topic, body, author, kind) on public.posts to anon;
grant insert (district, crop, topic, body, author, device) on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

-- ---------------------------------------------------------------- marketplace board
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  kind text not null check (kind in ('sell', 'buy')),
  district text not null check (char_length(district) between 2 and 40),
  crop text not null check (char_length(crop) between 1 and 40),
  variety text not null default '' check (char_length(variety) <= 40),
  qty_qtl numeric not null check (qty_qtl > 0 and qty_qtl < 100000),
  price numeric check (price is null or (price > 0 and price < 1000000)),
  ready_from date,
  name text not null check (char_length(name) between 2 and 40),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  verified boolean not null default false,
  device text not null default '' check (char_length(device) <= 64)
);
create index if not exists listings_feed on public.listings (status, kind, district, created_at desc);
alter table public.listings enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listings' and policyname = 'public reads approved listings') then
  create policy "public reads approved listings" on public.listings for select to anon using (status = 'approved' and expires_at > now());
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listings' and policyname = 'public submits pending listings') then
  create policy "public submits pending listings" on public.listings for insert to anon with check (status = 'pending' and verified = false);
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'listings' and policyname = 'admin manages listings') then
  create policy "admin manages listings" on public.listings for all to authenticated using (public.is_admin()) with check (public.is_admin());
end if; end $$;
revoke all on public.listings from anon;
grant select (id, created_at, kind, district, crop, variety, qty_qtl, price, ready_from, name, phone, note, verified) on public.listings to anon;
grant insert (kind, district, crop, variety, qty_qtl, price, ready_from, name, phone, note, device) on public.listings to anon;
grant select, insert, update, delete on public.listings to authenticated;

-- ---------------------------------------------------------------- reports from the public
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  target_table text not null check (target_table in ('posts', 'listings')),
  target_id uuid not null,
  reason text not null default '' check (char_length(reason) <= 200),
  device text not null default '' check (char_length(device) <= 64)
);
alter table public.reports enable row level security;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'public files a report') then
  create policy "public files a report" on public.reports for insert to anon with check (true);
end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reports' and policyname = 'admin manages reports') then
  create policy "admin manages reports" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
end if; end $$;
revoke all on public.reports from anon;
grant insert (target_table, target_id, reason, device) on public.reports to anon;
grant select, insert, update, delete on public.reports to authenticated;

-- ---------------------------------------------------------------- limits against flooding
-- At most 5 submissions a day from one device id, and a ceiling on the waiting queue, for each table.
-- A device id can be faked, so this slows abuse; it does not stop a determined attacker. Approval by an admin is the real gate.
create or replace function public.limit_submissions() returns trigger language plpgsql security definer set search_path = public as $$
declare today int; waiting int;
begin
  if public.is_admin() then return new; end if;
  execute format('select count(*) from public.%I where device = $1 and created_at > now() - interval ''1 day''', tg_table_name) into today using new.device;
  if today >= 5 then raise exception 'too many submissions today' using errcode = 'P0001'; end if;
  if tg_table_name <> 'reports' then
    execute format('select count(*) from public.%I where status = ''pending''', tg_table_name) into waiting;
    if waiting >= 500 then raise exception 'the waiting list is full' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
create or replace trigger limit_posts before insert on public.posts for each row execute function public.limit_submissions();
create or replace trigger limit_listings before insert on public.listings for each row execute function public.limit_submissions();
create or replace trigger limit_reports before insert on public.reports for each row execute function public.limit_submissions();

-- tell the Data API that new tables exist
notify pgrst, 'reload schema';

-- After creating your own user under Authentication > Users, make it the admin (put your email in):
--   insert into public.admins (user_id) select id from auth.users where email = 'YOUR_EMAIL' on conflict do nothing;
-- Keep "Allow new users to sign up" switched off under Authentication > Sign In / Providers.
