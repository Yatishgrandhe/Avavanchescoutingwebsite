/** Current FRC season year. Used to filter scouting data to this season only (excludes e.g. 2025). */
export const CURRENT_SEASON_YEAR = 2026;

/** Supabase like pattern for match_id: only rows whose match_id contains the season year (e.g. avalanche_2026_qm1). */
export const SCOUTING_MATCH_ID_SEASON_PATTERN = '%2026%';

/** Current event key for matches/pick lists (e.g. load from TBA with this key). */
export const CURRENT_EVENT_KEY = '2026ncash';

/** Current event display name (e.g. shown in UI and in Google Drive uploads). */
export const CURRENT_EVENT_NAME = 'NC Asheville 2026';

/** Supabase auth user IDs of admins who are blocked from the pick list page (e.g. Colin). Only these admins are denied; all other admins can access. */
export const PICKLIST_BLOCKED_ADMIN_USER_IDS: string[] = ['e9cf2206-eb46-4d49-8948-d005e4698e6f'];
