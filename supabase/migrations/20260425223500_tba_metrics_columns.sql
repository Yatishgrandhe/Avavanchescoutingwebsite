-- TBA-backed team metrics for current/future competitions.
-- Intentionally not mirrored to past_teams so historical pages remain legacy.
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS tba_opr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tba_epa numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS normalized_opr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_shooting_time_sec numeric;
