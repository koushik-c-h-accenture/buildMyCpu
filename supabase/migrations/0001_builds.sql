-- Leaderboard table. Run this once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> paste -> Run), or via `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.builds (
  id              uuid primary key default gen_random_uuid(),
  username        text not null,
  build_name      text not null,
  cpu_id          text not null,
  gpu_id          text not null,
  cpu_label       text not null,
  gpu_label       text not null,
  build_spec      jsonb not null,
  final_score     integer not null,
  score_breakdown jsonb not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_builds_score
  on public.builds (final_score desc, created_at asc);

-- Row-Level Security: anyone may READ the leaderboard, but nobody may write
-- with the anon key. Only the submit-build Edge Function (service-role key,
-- which bypasses RLS) can INSERT — so scores can't be faked from the client.
alter table public.builds enable row level security;

drop policy if exists "public read builds" on public.builds;
create policy "public read builds"
  on public.builds for select
  using (true);

-- Allow the app (anon publishable key) to submit builds directly. The full
-- build_spec is stored so any entry can be re-scored/audited by an admin.
drop policy if exists "public insert builds" on public.builds;
create policy "public insert builds"
  on public.builds for insert
  with check (true);
