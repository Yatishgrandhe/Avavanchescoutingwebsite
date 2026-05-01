-- Additive migration only: no deletes, no drops.
ALTER TABLE public.scouting_data
  ADD COLUMN IF NOT EXISTS statbotics_auto_score_rounded integer,
  ADD COLUMN IF NOT EXISTS statbotics_teleop_score_rounded integer;

