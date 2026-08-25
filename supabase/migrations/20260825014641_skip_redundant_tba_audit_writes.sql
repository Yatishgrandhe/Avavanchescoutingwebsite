-- TBA syncs frequently issue upserts. Preserve audit history for real changes,
-- but do not create full JSON snapshots when an UPDATE did not change a row.
CREATE OR REPLACE FUNCTION public.audit_matches_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.matches_audit (operation_type, record_id, old_data, changed_at)
    VALUES ('DELETE', OLD.match_id, row_to_json(OLD)::jsonb, now());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.matches_audit (operation_type, record_id, old_data, new_data, changed_at)
    VALUES ('UPDATE', NEW.match_id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, now());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.matches_audit (operation_type, record_id, new_data, changed_at)
    VALUES ('INSERT', NEW.match_id, row_to_json(NEW)::jsonb, now());
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_teams_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.teams_audit (operation_type, record_id, old_data, changed_at)
    VALUES ('DELETE', OLD.team_number, row_to_json(OLD)::jsonb, now());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.teams_audit (operation_type, record_id, old_data, new_data, changed_at)
    VALUES ('UPDATE', NEW.team_number, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, now());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.teams_audit (operation_type, record_id, new_data, changed_at)
    VALUES ('INSERT', NEW.team_number, row_to_json(NEW)::jsonb, now());
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;
