-- Move legacy unscoped data to Avalanche organization
DO $$
DECLARE
    avalanche_org_id uuid := '79fb9e7a-a9c8-4c8d-8a5e-a76613de7f86';
BEGIN
    UPDATE public.teams SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.matches SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.scouting_data SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.pit_scouting_data SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.scout_names SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_competitions SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_scouting_data SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_matches SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_teams SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_pit_scouting_data SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.past_pick_lists SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.pick_lists SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
    UPDATE public.event_scouting_lock SET organization_id = avalanche_org_id WHERE organization_id IS NULL;
END $$;
