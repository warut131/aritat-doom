-- ARITAT DOOM: simple username/password accounts + cloud saves.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Passwords are stored as bcrypt hashes. The table itself is closed to the public key;
-- the game only talks to it through the 4 functions below.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  pass text not null,
  token uuid not null default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login timestamptz
);
create unique index if not exists players_username_lower on public.players (lower(username));
alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

create or replace function public.game_register(p_user text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r public.players;
begin
  p_user := trim(p_user);
  if p_user !~ '^[A-Za-z0-9_ก-๙]{3,14}$' then raise exception 'bad_user'; end if;
  if length(p_pass) < 4 or length(p_pass) > 64 then raise exception 'bad_pass'; end if;
  if exists (select 1 from public.players where lower(username) = lower(p_user)) then raise exception 'taken'; end if;
  insert into public.players (username, pass, last_login) values (p_user, crypt(p_pass, gen_salt('bf')), now()) returning * into r;
  return json_build_object('token', r.token, 'username', r.username, 'data', r.data);
end $$;

create or replace function public.game_login(p_user text, p_pass text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r public.players;
begin
  select * into r from public.players where lower(username) = lower(trim(p_user));
  if r.id is null or r.pass <> crypt(p_pass, r.pass) then raise exception 'bad_login'; end if;
  update public.players set last_login = now() where id = r.id;
  return json_build_object('token', r.token, 'username', r.username, 'data', r.data);
end $$;

create or replace function public.game_load(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r public.players;
begin
  select * into r from public.players where token = p_token;
  if r.id is null then raise exception 'bad_token'; end if;
  return json_build_object('username', r.username, 'data', r.data);
end $$;

create or replace function public.game_store(p_token uuid, p_data jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if octet_length(p_data::text) > 200000 then raise exception 'too_big'; end if;
  update public.players set data = p_data, updated_at = now() where token = p_token;
  if not found then raise exception 'bad_token'; end if;
  return true;
end $$;

revoke all on function public.game_register(text, text), public.game_login(text, text), public.game_load(uuid), public.game_store(uuid, jsonb) from public;
grant execute on function public.game_register(text, text), public.game_login(text, text), public.game_load(uuid), public.game_store(uuid, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';
