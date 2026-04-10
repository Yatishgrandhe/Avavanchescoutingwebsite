-- Fix: Allow all existing users to access scouting forms.
-- Previously new users were created with can_edit_forms = false, locking them out.
-- This migration grants form access to every user who hasn't been explicitly blocked.

UPDATE public.users
SET can_edit_forms = true
WHERE can_edit_forms IS NULL OR can_edit_forms = false;

-- Also clear any stale global scouting locks so forms are not locked org-wide.
-- Admins can re-lock from the sidebar if needed.
UPDATE public.app_config
SET value = 'false'
WHERE key IN ('match_scouting_locked', 'pit_scouting_locked')
  AND value = 'true';
