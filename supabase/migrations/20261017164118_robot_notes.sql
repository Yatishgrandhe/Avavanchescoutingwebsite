-- Observations are independent of match scoring and persist when live data is archived.
create table if not exists public.robot_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_key text not null check (char_length(event_key) between 1 and 120),
  event_year integer not null check (event_year between 1992 and 2100),
  event_name text not null check (char_length(event_name) between 1 and 200),
  competition_id uuid references public.past_competitions(id) on delete set null,
  team_number integer not null check (team_number between 1 and 99999),
  match_reference text check (char_length(match_reference) <= 80),
  body text not null check (char_length(btrim(body)) between 3 and 4000),
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 120),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists robot_notes_event_team_idx
  on public.robot_notes(organization_id, event_key, event_year, team_number, created_at desc)
  where deleted_at is null;
create index if not exists robot_notes_author_idx on public.robot_notes(author_id);
create index if not exists robot_notes_competition_idx on public.robot_notes(competition_id);

alter table public.robot_notes enable row level security;
-- All access goes through the API, which verifies the user and organization.
revoke all on public.robot_notes from anon, authenticated;
grant select, insert, update, delete on public.robot_notes to service_role;

comment on table public.robot_notes is 'Event-scoped qualitative robot observations; retained independently of live scouting tables.';
