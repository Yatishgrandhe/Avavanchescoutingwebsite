-- Add EPA columns to public.teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS epa numeric DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS endgame_epa numeric DEFAULT 0;

-- Add EPA columns to public.past_teams
ALTER TABLE public.past_teams ADD COLUMN IF NOT EXISTS epa numeric DEFAULT 0;
ALTER TABLE public.past_teams ADD COLUMN IF NOT EXISTS endgame_epa numeric DEFAULT 0;

-- Ensure organization_id columns are indexed for multi-tenant performance
CREATE INDEX IF NOT EXISTS teams_organization_id_idx ON public.teams (organization_id);
CREATE INDEX IF NOT EXISTS scouting_data_organization_id_idx ON public.scouting_data (organization_id);
CREATE INDEX IF NOT EXISTS matches_organization_id_idx ON public.matches (organization_id);
CREATE INDEX IF NOT EXISTS scout_names_organization_id_idx ON public.scout_names (organization_id);
CREATE INDEX IF NOT EXISTS pit_scouting_data_organization_id_idx ON public.pit_scouting_data (organization_id);
CREATE INDEX IF NOT EXISTS past_scouting_data_organization_id_idx ON public.past_scouting_data (organization_id);
CREATE INDEX IF NOT EXISTS past_teams_organization_id_idx ON public.past_teams (organization_id);
CREATE INDEX IF NOT EXISTS past_matches_organization_id_idx ON public.past_matches (organization_id);
CREATE INDEX IF NOT EXISTS past_pit_scouting_data_organization_id_idx ON public.past_pit_scouting_data (organization_id);
CREATE INDEX IF NOT EXISTS past_competitions_organization_id_idx ON public.past_competitions (organization_id);
CREATE INDEX IF NOT EXISTS pick_lists_organization_id_idx ON public.pick_lists (organization_id);
CREATE INDEX IF NOT EXISTS past_pick_lists_organization_id_idx ON public.past_pick_lists (organization_id);
