-- Aritat ซอยนรก : add per-level leaderboards (run once in Supabase → SQL Editor)
alter table public.scores add column if not exists level int not null default 1 check (level between 1 and 9);
create index if not exists scores_level_rank on public.scores (level, wave desc, kills desc);
