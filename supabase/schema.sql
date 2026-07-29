-- Run this once in Supabase: Dashboard > SQL Editor > paste > Run.
-- Creates the single shared-household table KaMaSe stores everything in.

create table if not exists public.kamase_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.kamase_state (id, data)
values ('household', '{}'::jsonb)
on conflict (id) do nothing;

-- "Anyone with the link is you three": RLS on, anon key may read/write only this table.
alter table public.kamase_state enable row level security;

drop policy if exists "household read"   on public.kamase_state;
drop policy if exists "household write"  on public.kamase_state;
drop policy if exists "household update" on public.kamase_state;

create policy "household read"   on public.kamase_state for select using (true);
create policy "household write"  on public.kamase_state for insert with check (true);
create policy "household update" on public.kamase_state for update using (true) with check (true);

-- Realtime so the other phone updates instantly.
alter publication supabase_realtime add table public.kamase_state;
