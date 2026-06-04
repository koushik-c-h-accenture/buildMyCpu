-- Competition platform. Run in Supabase → SQL Editor (after / together with 0001).

create extension if not exists pgcrypto;

-- leaderboard (same as 0001) + competition link
create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  build_name text not null,
  cpu_id text not null,
  gpu_id text not null,
  cpu_label text not null,
  gpu_label text not null,
  build_spec jsonb not null,
  final_score integer not null,
  score_breakdown jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.builds add column if not exists competition_id text;
create index if not exists idx_builds_score on public.builds (final_score desc, created_at asc);
create index if not exists idx_builds_comp on public.builds (competition_id, final_score desc);

alter table public.builds enable row level security;
drop policy if exists "public read builds" on public.builds;
create policy "public read builds" on public.builds for select using (true);
drop policy if exists "public insert builds" on public.builds;
create policy "public insert builds" on public.builds for insert with check (true);

-- competitions: whoever creates a game is its host (holds the host_pin)
create table if not exists public.competitions (
  game_id text primary key,
  name text not null,
  host_pin text not null,
  budget_usd integer not null,
  max_submissions integer not null default 3,
  max_tests integer not null default 0,        -- 0 = unlimited tests
  auto_filter boolean not null default false,  -- guide players by hiding incompatible parts
  duration_min integer not null default 20,
  status text not null default 'lobby',   -- lobby | running | ended
  started_at timestamptz,
  ends_at timestamptz,
  reveal boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.competitions add column if not exists max_tests integer not null default 0;
alter table public.competitions add column if not exists auto_filter boolean not null default false;
alter table public.competitions enable row level security;
drop policy if exists "comp read" on public.competitions;
create policy "comp read" on public.competitions for select using (true);
drop policy if exists "comp insert" on public.competitions;
create policy "comp insert" on public.competitions for insert with check (true);
drop policy if exists "comp update" on public.competitions;
create policy "comp update" on public.competitions for update using (true) with check (true);
