-- Shuttle fields for match scouting (safe if columns already exist in hosted DB)
ALTER TABLE public.scouting_data
  ADD COLUMN IF NOT EXISTS shuttling boolean NOT NULL DEFAULT false;

ALTER TABLE public.scouting_data
  ADD COLUMN IF NOT EXISTS shuttling_consistency text;

COMMENT ON COLUMN public.scouting_data.shuttling IS 'Whether the robot performed shuttling (from step 4 / misc form)';
COMMENT ON COLUMN public.scouting_data.shuttling_consistency IS 'consistent | inconsistent when shuttling; NULL otherwise';
