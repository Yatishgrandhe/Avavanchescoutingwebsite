# Robot Notes

Organization members can open **Robot Notes** from the Scout section of the sidebar. Each observation requires an event and team number. A match reference is optional. Imported teams appear as suggestions; typing an unimported team number is supported.

For an event that has not been imported, enter its name and year. A later CSV import can use the same name, or select that event in **Connect to an existing event**. Both paths preserve the event identity. Team names come from the event roster on each load and update when the page regains focus or Refresh is pressed.

Summaries are extractive: they select from saved observations without inventing performance claims. Every original observation remains expandable below the summary. Authors and organization admins can remove current-event notes. Archived events are read-only.

## Storage and archiving

Apply `supabase/migrations/20261017164118_robot_notes.sql` before deploying the feature to a new database. The migration has been applied to the linked production project.

`robot_notes` stores observations independently of match and pit scouting. Its organization, event key, year, and team number are durable identifiers. Team numbers do not require a team-table foreign key, allowing notes before imports. Archiving attaches the competition ID before clearing live data. The dedicated page and the archived competition's Robot Notes tab read the same preserved rows.

The table has RLS enabled and no browser-role access. `/api/robot-notes` verifies the Supabase user and database organization on every request. Note authorship and organization are assigned by the server. Deletion is a soft deletion. The archive snapshot uses the event roster, including shared team metadata, to retain imported team names.

## Verification

`scripts/test-robot-notes.mjs` creates isolated test organizations and users. It checks required teams, optional matches, notes before imports, CSV name/key synchronization, more than 1,000 notes, organization isolation, author/admin permissions, retry deduplication, separation from match scores, archive retention, and browser-role denial.

Run a local app server with the same Supabase environment, then run the script with `ROBOT_NOTES_TEST_ALLOW_DATABASE=true`. Credentials must be supplied through environment variables; the script does not print them. The test refuses non-local app URLs. It removes its own generated data by default. `--keep` retains fixtures and browser storage under `/tmp` for responsive browser QA; `--cleanup` removes them afterwards. It never uses an existing organization's data as a fixture.
