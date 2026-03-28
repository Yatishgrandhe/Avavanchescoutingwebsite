-- Applied on production via Supabase MCP; kept here for history and local resets.
-- Ensures every auth user has public.users with Avalanche org; aligns operational + past tables.

DO $$
DECLARE
  aid uuid := (SELECT id FROM public.organizations WHERE name ILIKE '%Avalanche%' ORDER BY created_at LIMIT 1);
BEGIN
  IF aid IS NULL THEN
    RAISE EXCEPTION 'Avalanche organization not found';
  END IF;

  UPDATE public.users
  SET organization_id = aid, updated_at = now()
  WHERE organization_id IS NULL;

  INSERT INTO public.users (
    id, email, name, image, organization_id, role,
    can_edit_forms, can_view_pick_list, can_view_stats,
    created_at, updated_at
  )
  SELECT
    au.id,
    au.email,
    COALESCE(NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''), split_part(COALESCE(au.email, 'user'), '@', 1), 'User'),
    NULLIF(trim(au.raw_user_meta_data->>'avatar_url'), ''),
    aid,
    'user',
    false,
    false,
    true,
    now(),
    now()
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
  ON CONFLICT (id) DO UPDATE SET
    organization_id = COALESCE(public.users.organization_id, EXCLUDED.organization_id),
    email = COALESCE(EXCLUDED.email, public.users.email),
    updated_at = now();

  UPDATE public.users SET organization_id = aid, updated_at = now() WHERE organization_id IS NULL;

  UPDATE public.teams SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.matches SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.scouting_data SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.pit_scouting_data SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.pick_lists SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.scout_names SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;

  UPDATE public.past_competitions SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.past_scouting_data SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.past_matches SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.past_teams SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.past_pit_scouting_data SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
  UPDATE public.past_pick_lists SET organization_id = aid WHERE organization_id IS NULL OR organization_id <> aid;
END $$;
