-- Organizations: allow authenticated INSERT (RLS had SELECT only; INSERT was denied).
-- Allow SELECT for the row creator immediately after INSERT (before users.organization_id is updated),
-- e.g. setup-org and org-manager create flows using .insert().select().

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

CREATE OR REPLACE FUNCTION public.organizations_set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS organizations_set_created_by ON public.organizations;
CREATE TRIGGER organizations_set_created_by
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.organizations_set_created_by();

DROP POLICY IF EXISTS "organizations_select_member_or_superadmin" ON public.organizations;

CREATE POLICY "organizations_select_member_or_superadmin"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  (created_by IS NOT NULL AND created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.organization_id = organizations.id
      OR u.role = 'superadmin'
    )
  )
);

DROP POLICY IF EXISTS "organizations_insert_authenticated" ON public.organizations;

CREATE POLICY "organizations_insert_authenticated"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
