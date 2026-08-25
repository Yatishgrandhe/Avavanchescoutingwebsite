-- Covers the relationships used by the app's scoped API queries.
CREATE INDEX IF NOT EXISTS app_config_organization_id_idx
  ON public.app_config (organization_id);
CREATE INDEX IF NOT EXISTS organization_invites_created_by_idx
  ON public.organization_invites (created_by);
CREATE INDEX IF NOT EXISTS organization_invites_target_organization_id_idx
  ON public.organization_invites (target_organization_id);
CREATE INDEX IF NOT EXISTS organization_invites_used_by_idx
  ON public.organization_invites (used_by);
CREATE INDEX IF NOT EXISTS organizations_created_by_idx
  ON public.organizations (created_by);
CREATE INDEX IF NOT EXISTS pit_scouting_data_submitted_by_idx
  ON public.pit_scouting_data (submitted_by);
CREATE INDEX IF NOT EXISTS pit_scouting_data_team_number_idx
  ON public.pit_scouting_data (team_number);
CREATE INDEX IF NOT EXISTS scouting_data_organization_match_idx
  ON public.scouting_data (organization_id, match_id);
CREATE INDEX IF NOT EXISTS users_organization_id_idx
  ON public.users (organization_id);
CREATE INDEX IF NOT EXISTS users_team_number_idx
  ON public.users (team_number);
