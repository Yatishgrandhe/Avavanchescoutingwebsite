-- Per-org match rows; composite PK; scouting_data references (organization_id, match_id)
ALTER TABLE public.scouting_data DROP CONSTRAINT IF EXISTS scouting_data_match_id_fkey;

ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_pkey;

UPDATE public.matches
SET organization_id = (SELECT id FROM public.organizations ORDER BY created_at NULLS LAST LIMIT 1)
WHERE organization_id IS NULL;

DELETE FROM public.matches WHERE organization_id IS NULL;

ALTER TABLE public.matches ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.matches ADD PRIMARY KEY (organization_id, match_id);

ALTER TABLE public.scouting_data ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.scouting_data
  ADD CONSTRAINT scouting_data_match_org_fkey
  FOREIGN KEY (organization_id, match_id)
  REFERENCES public.matches (organization_id, match_id)
  ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.event_team_roster (
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  event_key text NOT NULL,
  team_number integer NOT NULL,
  team_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, event_key, team_number)
);

CREATE INDEX IF NOT EXISTS event_team_roster_org_event_idx ON public.event_team_roster (organization_id, event_key);

ALTER TABLE public.event_team_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_team_roster_select_member ON public.event_team_roster
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT u.organization_id FROM public.users u WHERE u.id = auth.uid() AND u.organization_id IS NOT NULL
    )
  );

COMMENT ON TABLE public.event_team_roster IS 'TBA-synced team nicknames per org and event; avoids cross-org teams PK conflicts';
