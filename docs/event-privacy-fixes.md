# Event selection and private scouting notes

Pick lists default to the organization's configured event. The event picker can open saved lists for previous events without moving, clearing, or renaming them. Every list displays its event key. Available robots come from that event's roster and schedule, including robots with zero forms. Scoring rows are restricted to that organization and event's match IDs; old CSV settings do not override a TBA event.

Written match comments, nested free-text notes, pit observations, and archived pick-list notes are private to the owning organization. Server APIs redact response copies for guests and other organizations, preserving numeric run and scoring data. The database's additive restrictive read policies prevent direct browser reads from bypassing the API. Organization members retain original notes, and Robot Notes summaries remain admin-only.

Apply `supabase/migrations/20261023173704_private_scouting_notes.sql` when installing in another database. It is already applied to production. It adds access restrictions and missing archive columns without deleting or rewriting existing rows. Public team history uses the sanitized archive API rather than reading private tables directly.

Archiving respects the configured event even if it has no matches. All event snapshots are inserted before live scouting records are removed. Live cleanup is limited to the archived event; shared pit forms remain available because they do not have an event key. Every pit form included in the snapshot is retained, and other events' lists, schedules, and forms are untouched.

## Regression verification

1. Run a local application with the production-compatible database environment.
2. Run `scripts/test-robot-notes.mjs --keep` with `ROBOT_NOTES_TEST_ALLOW_DATABASE=true` to create isolated fixture organizations/users.
3. Run `scripts/test-event-privacy.mjs` with the same environment. It uses only the named fixtures and tests event switching, zero-form roster teams, event-specific averages, private API/direct-table reads, archived notes, newer archive fields, and preservation of another event's data.
4. Use the generated temporary browser storage for desktop and phone QA.
5. Run `scripts/test-robot-notes.mjs --cleanup` to remove only those fixtures.

Before applying this fix, a private local backup of live and archived scouting tables, notes, pick lists, rosters, schedules, team metadata, and settings was saved outside the Git repository. Compare original rows against that backup after verification; do not overwrite concurrent user submissions during recovery.
