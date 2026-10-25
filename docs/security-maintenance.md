# Security maintenance

Security fixes applied October 25, 2026.

## Server permissions

- Backup and restore require a current database-backed admin/superadmin role and an organization. They cannot operate across organizations. Neither exports nor restores authentication, session or permission tables.
- Backups paginate organization rows, including live and archived scouting data, robot notes and pick lists. A table-read failure fails the backup rather than returning an apparently complete file.
- Restore accepts merge only, validates every row and parent organization before inserting, uses the caller's RLS client, and never overwrites or deletes existing rows. Version 1 backups are accepted only when their restorable rows have the correct organization. Identity tables in legacy backups are ignored.
- Restore is not a multi-table transaction. If a later batch fails, earlier new rows can remain; the API reports failure and merge can be retried. HTTP restore bodies are limited to 4 MB.
- Scouting deletion and lock updates use trusted database roles. Deletion is scoped to the caller's organization. User-editable auth metadata never grants an admin role.
- Uploads require a signed-in organization member before multipart parsing. Images are decoded with pixel/file limits, converted to JPEG, and stored at unique organization/user paths without overwriting files.
- Removing a form photo unlinks it without physically deleting its file. Existing and archived forms may share the same image. The legacy deletion API is authenticated and retains the file; physical cleanup requires a separate retention process.
- Global Drive diagnostics require a database-backed superadmin, use POST, and perform no provider file creation/deletion. Upload diagnostics require an organization admin and expose no credential prefixes.

## Dependencies and runtime

Next.js 16.4.3, Sharp 0.35.5 and Capacitor 8.5.3 replace the vulnerable locked versions. Other compatible security updates are recorded in the lockfile. Local runtime pins and package engines now match Vercel's Node 22 major version.

Two targeted overrides address transitive advisories without downgrading parent packages:

- `postcss-selector-parser` 7.1.6 fixes the selector parsing denial-of-service advisory. The production CSS build verifies the affected Tailwind tooling path.
- Xcode's `uuid` dependency uses CommonJS-compatible 11.1.1. A UUID-generation smoke check verifies Xcode's v4 API compatibility.

Remove overrides when upstream dependencies include the patched versions themselves. Always commit the lockfile and repeat the audit/build checks after changes.

Capacitor dependency updates do not patch already-installed native apps. Those require a separate native rebuild and distribution; this website release does not claim to update installed apps.

## Verification

Run on Node 22:

```
npm run test:security
npm run type-check
npm audit
npm run build
```

The security suite uses real route modules with mocked Supabase/Drive providers, including malicious-member, forged-role, cross-organization, pagination, archive-note retention and restore-failure cases. Upload tests parse real multipart data and convert real image bytes; cloud storage is mocked. No test in this suite uses production credentials or accesses production data.

Release checks also exercised the built server over HTTP: normal pages rendered, protected anonymous requests returned 401, and Drive diagnostic GET returned 405. Real organization-admin backup/restore against production data was intentionally not executed. Existing database policies were not migrated or exhaustively audited in this patch.
