# Disaster Recovery

Written for Dia 80's "Backup system testado" / "Disaster recovery plan" checklist
items. Everything below was run for real against this dev machine's local
PostgreSQL 17 instance (port 5433) — not assumed to work from reading the
`pg_dump`/`pg_restore` docs.

## Backup

`npm run backup --workspace=packages/backend` (`scripts/backup.js`) runs
`pg_dump -Fc` (custom format — compressed, restorable straight into a fresh
database) against `DATABASE_URL`, writing a timestamped `.dump` file to
`packages/backend/backups/` (gitignored — these are real dumps of real, if
currently test-only, user data and must never be committed).

`PG_DUMP_PATH` overrides where the `pg_dump` binary lives; it defaults to this
machine's actual install path (`C:/Program Files/PostgreSQL/17/bin/pg_dump.exe`)
since two PostgreSQL versions coexist here (17 for this project, 18 pre-existing
and unrelated) and neither is on `PATH`.

## Restore — actually tested, not assumed

An untested backup isn't a real backup. `npm run backup:verify` (`scripts/restoreTest.js`):

1. Creates a throwaway database on the same Postgres instance (`techspeak_restore_test_<timestamp>`) — never touches the real dev database.
2. Restores the latest `backups/*.dump` file into it with `pg_restore`.
3. Compares row counts for `users`, `audiobooks`, `chapters`, `words`, `flashcards` between the source database and the restored one.
4. Drops the throwaway database in a `finally` block, whether verification passed or the restore itself failed.

Real run, this session (2026-07-28), against this dev DB's actual accumulated data:

| table      | source | restored | match |
| ---------- | ------ | -------- | ----- |
| users      | 94     | 94       | ✅    |
| audiobooks | 25     | 25       | ✅    |
| chapters   | 125    | 125      | ✅    |
| words      | 127    | 127      | ✅    |
| flashcards | 7      | 7        | ✅    |

Confirmed afterward that no `techspeak_restore_test_*` database was left behind.

## What this does and doesn't cover

**Covered, tested today:** a single-instance logical backup/restore cycle proves
`pg_dump`/`pg_restore` round-trip this schema's real data correctly, and gives a
manual recovery path (restore the latest `.dump` into a fresh database, point
`DATABASE_URL` at it) if this dev machine's Postgres were ever lost.

**Not covered — honest gaps, matching this project's standing "no hosting
provider chosen yet" gap** (`deploy-staging.yml`'s own TODO):

- **No automated schedule.** There's no production server to run a cron job on
  yet. Once a hosting provider is chosen, most managed Postgres offerings
  (RDS, Supabase, Railway, Render) include automated daily snapshots out of the
  box — that's the realistic production answer, not a hand-rolled cron calling
  this script.
- **No off-site/secondary copy.** Backups today are local files on the dev
  machine. A real production backup needs to live somewhere the same
  disk/machine failure can't also destroy.
- **No point-in-time recovery (WAL archiving).** Only tested full logical
  snapshots; a real production setup would want continuous WAL archiving for
  sub-daily RPO.
- **RTO/RPO are unestimated for a real deployment** — today's numbers (a
  restore of ~94 users / 127 words took well under a minute) are encouraging
  but measured against a small dev dataset on local disk, not representative of
  a real production data volume or network-attached storage.
- **Not integrated into CI or any monitoring/alerting** — running the backup is
  a manual step today (`npm run backup`), not a scheduled, observed job.

## Recommended path once a hosting provider is chosen

1. Confirm the provider's automated backup/point-in-time-recovery offering and enable it — don't rebuild what a managed Postgres provider already gives for free.
2. Keep `scripts/backup.js`/`scripts/restoreTest.js` as a portable, provider-independent fallback (e.g. for migrating between providers, or a local safety copy before a risky migration).
3. Re-run `backup:verify`'s exact row-count check against production data at least once after going live, the same way it was verified here against dev data.
