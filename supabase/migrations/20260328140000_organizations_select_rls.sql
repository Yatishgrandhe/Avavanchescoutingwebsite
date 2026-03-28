-- organizations had RLS enabled with no policies, so the client could not SELECT rows.
-- That made Team Management show "Not Assigned" even when users.organization_id was set.

DROP POLICY IF EXISTS "organizations_select_member_or_superadmin" ON public.organizations;

CREATE POLICY "organizations_select_member_or_superadmin"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
    AND (
      u.organization_id = organizations.id
      OR u.role = 'superadmin'
    )
  )
);
