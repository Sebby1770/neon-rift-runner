create table if not exists public.neon_rift_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id text not null unique,
  app_version text not null,
  score integer not null check (score >= 0 and score <= 10000000),
  gates integer not null check (gates >= 0 and gates <= 100000),
  streak integer not null check (streak >= 0 and streak <= 100000),
  duration_seconds numeric(10, 2) not null check (duration_seconds >= 0 and duration_seconds <= 86400),
  zen boolean not null default false,
  quality text not null check (quality in ('ultra', 'performance')),
  user_agent text check (char_length(user_agent) <= 180)
);

alter table public.neon_rift_runs enable row level security;

revoke update, delete on table public.neon_rift_runs from anon, authenticated;
grant select, insert on table public.neon_rift_runs to anon, authenticated;

drop policy if exists "read public leaderboard runs" on public.neon_rift_runs;
create policy "read public leaderboard runs"
  on public.neon_rift_runs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "submit valid leaderboard runs" on public.neon_rift_runs;
create policy "submit valid leaderboard runs"
  on public.neon_rift_runs
  for insert
  to anon, authenticated
  with check (
    score >= 0
    and gates >= 0
    and streak >= 0
    and duration_seconds between 0 and 86400
    and quality in ('ultra', 'performance')
  );

create index if not exists idx_neon_rift_runs_score
  on public.neon_rift_runs (score desc, created_at desc);
