-- Aritat ซอยนรก : fix leaderboard access (Supabase → SQL Editor → paste → Run). Safe to run more than once.
-- New Supabase projects no longer give the public (anon) key access to new tables automatically.
create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 14),
  wave int not null check (wave between 1 and 300),
  kills int not null check (kills between 0 and 50000),
  char text not null default 'aritat' check (char_length(char) <= 16),
  mode text not null default 'solo' check (mode in ('solo','coop')),
  acc int check (acc between 0 and 100)
);
alter table public.scores add column if not exists level int not null default 1 check (level between 1 and 9);
create index if not exists scores_level_rank on public.scores (level, wave desc, kills desc);
alter table public.scores enable row level security;
drop policy if exists "anyone can read" on public.scores;
drop policy if exists "anyone can add" on public.scores;
create policy "anyone can read" on public.scores for select to anon, authenticated using (true);
create policy "anyone can add"  on public.scores for insert to anon, authenticated with check (true);
grant select, insert on public.scores to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
notify pgrst, 'reload schema';
