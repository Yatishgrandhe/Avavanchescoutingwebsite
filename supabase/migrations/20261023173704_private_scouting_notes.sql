-- Read restrictions are additive: no rows are deleted or rewritten.
-- Public score pages use server APIs that redact free text from response copies.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['scouting_data','past_scouting_data','pit_scouting_data','past_pit_scouting_data','past_pick_lists'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'private_scouting_read_boundary') THEN
      EXECUTE format('CREATE POLICY private_scouting_read_boundary ON public.%I AS RESTRICTIVE FOR SELECT TO anon, authenticated USING (organization_id = (SELECT organization_id FROM public.users WHERE id = (SELECT auth.uid())))', t);
    END IF;
  END LOOP;
END $$;

-- Archive snapshots must accept every current scouting field, including newer score/run fields.
DO $$
DECLARE source_table text; destination_table text; column_info record;
BEGIN
  FOREACH source_table IN ARRAY ARRAY['scouting_data','pit_scouting_data'] LOOP
    destination_table := 'past_' || source_table;
    FOR column_info IN
      SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS column_type
      FROM pg_attribute a
      WHERE a.attrelid = ('public.' || source_table)::regclass AND a.attnum > 0 AND NOT a.attisdropped
        AND NOT EXISTS (SELECT 1 FROM pg_attribute b WHERE b.attrelid = ('public.' || destination_table)::regclass AND b.attname = a.attname AND b.attnum > 0 AND NOT b.attisdropped)
    LOOP
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', destination_table, column_info.attname, column_info.column_type);
    END LOOP;
  END LOOP;
END $$;
