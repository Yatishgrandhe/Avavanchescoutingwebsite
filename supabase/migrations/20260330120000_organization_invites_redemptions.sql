-- Track how many times a link was used; cap optionally (NULL = unlimited until expires_at).
ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS redemption_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS max_redemptions integer NULL;

COMMENT ON COLUMN public.organization_invites.max_redemptions IS 'NULL = unlimited redemptions until expires_at; positive integer = stop after N successful uses (e.g. 1 for single-use new-org).';

COMMENT ON COLUMN public.organization_invites.redemption_count IS 'Successful completions (join_org or new_org); shown to admins for analytics.';
