# TBA event imports

The integration uses [TBA API v3](https://www.thebluealliance.com/apidocs/v3), checked against specification 3.27.2. Requests send `X-TBA-Auth-Key`; the API base remains `/api/v3`.

- `/event/{event_key}/teams` supplies event membership and official team names. Shared `teams.organization_id` ownership is not an event roster.
- `/event/{event_key}/matches` includes qualification and playoff matches. The active scouting schedule selects `comp_level: qm` and preserves TBA's `match_number`.
- Preserve `alliances.red.team_keys` and `alliances.blue.team_keys` in their original order. Reject malformed numeric team keys before writing instead of dropping a slot or truncating a suffix into a different team number.
- TBA also documents `Event.remap_teams` for temporary offseason/pre-rookie/B-team identities. A suffixed identity must not be silently converted into its parent team's numeric identity.

Sync retains older roster/match rows and scouting records. For the organization's active TBA event, it refreshes `current_event_team_numbers` and `current_event_match_ids` from the verified response. Event lists, dashboards, and scouting use that active scope rather than every retained row.

Explicit manual team additions are recorded separately under `manual_event_team_numbers:{event_key}` in the organization's `app_config` and included in subsequent syncs. This preserves manual pit registrations without treating stale roster rows as current members. CSV imports use their uploaded schedule plus explicit manual team additions, and retain cached team names if TBA enrichment is unavailable.

## Verification

Run `node scripts/test-active-schedule.mjs` for isolated regressions, `npm run test:security`, `npm run type-check`, and `npm run build`.

`scripts/test-event-import-integration.mjs` is an explicit database integration test. It creates two temporary organizations/admin users, exercises real TBA sync and CSV reimport through the application, verifies organization isolation and scouting retention, and removes only its fixtures. It requires the usual Supabase bindings and:

```
EVENT_IMPORT_TEST_ALLOW_DATABASE=true
EVENT_IMPORT_TEST_BASE_URL=https://avalanchescouting.vercel.app
EVENT_IMPORT_TEST_EXPECTATIONS=/path/to/freshly-verified-tba-event.json
```

The expectations file contains `event_key`, `event_name`, `teams` (`team_number`, `team_name`), and `matches` (`match_number`, `red_teams`, `blue_teams`) verified against the official TBA event. Optional `EVENT_IMPORT_TEST_REPORT` stores the check summary. The script keeps a fixture-ID recovery file at `/tmp/avalanche-event-import-fixtures.json` until cleanup finishes; it never stores passwords or session tokens there.
