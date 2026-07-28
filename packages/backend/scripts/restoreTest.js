import 'dotenv/config';
import { execFile } from 'child_process';
import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import pg from 'pg';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

const PG_BIN = process.env.PG_BIN_DIR || 'C:/Program Files/PostgreSQL/17/bin';
const CREATEDB_PATH = path.join(PG_BIN, 'createdb.exe');
const DROPDB_PATH = path.join(PG_BIN, 'dropdb.exe');
const PG_RESTORE_PATH = path.join(PG_BIN, 'pg_restore.exe');

// Tables checked after restore - a representative cross-section (users,
// content hierarchy, a user-generated table) rather than every table, since
// the point is proving pg_restore reproduced the dump faithfully, not
// re-testing the schema itself.
const TABLES_TO_VERIFY = ['users', 'audiobooks', 'chapters', 'words', 'flashcards'];

async function latestBackupFile() {
  const files = (await readdir(BACKUPS_DIR)).filter((f) => f.endsWith('.dump')).sort();
  if (files.length === 0) {
    throw new Error(`No backup files found in ${BACKUPS_DIR} - run "npm run backup" first.`);
  }
  return path.join(BACKUPS_DIR, files[files.length - 1]);
}

function connOptions(sourceUrl) {
  const u = new URL(sourceUrl);
  return {
    hostname: u.hostname,
    port: u.port,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
  };
}

function maintenanceEnv(opts) {
  return { ...process.env, PGPASSWORD: opts.password };
}

// Dia 80: an untested backup isn't a real backup - this restores the latest
// dump into a throwaway database on the same local Postgres instance (never
// the real dev DB) and checks row counts match, then drops the throwaway DB
// either way. Proves pg_dump/pg_restore actually round-trip this schema's
// real data, not just that the dump command exits 0.
export async function runRestoreTest() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const backupFile = await latestBackupFile();
  const opts = connOptions(process.env.DATABASE_URL);
  const throwawayDb = `techspeak_restore_test_${Date.now()}`;
  const env = maintenanceEnv(opts);
  const commonArgs = ['-h', opts.hostname, '-p', opts.port, '-U', opts.username];

  console.log(`Using backup: ${backupFile}`);
  console.log(`Creating throwaway database: ${throwawayDb}`);
  await execFileAsync(CREATEDB_PATH, [...commonArgs, throwawayDb], { env });

  const throwawayUrl = `postgresql://${opts.username}:${encodeURIComponent(opts.password)}@${opts.hostname}:${opts.port}/${throwawayDb}`;

  try {
    console.log('Restoring backup into throwaway database...');
    await execFileAsync(PG_RESTORE_PATH, ['-d', throwawayUrl, backupFile]);

    const sourcePool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const restoredPool = new pg.Pool({ connectionString: throwawayUrl });

    const results = [];
    for (const table of TABLES_TO_VERIFY) {
      const [sourceRes, restoredRes] = await Promise.all([
        sourcePool.query(`SELECT COUNT(*) FROM ${table}`),
        restoredPool.query(`SELECT COUNT(*) FROM ${table}`),
      ]);
      const sourceCount = Number(sourceRes.rows[0].count);
      const restoredCount = Number(restoredRes.rows[0].count);
      results.push({ table, sourceCount, restoredCount, match: sourceCount === restoredCount });
    }

    await sourcePool.end();
    await restoredPool.end();

    const allMatch = results.every((r) => r.match);
    return { ok: allMatch, results, throwawayDb };
  } finally {
    console.log(`Dropping throwaway database: ${throwawayDb}`);
    await execFileAsync(DROPDB_PATH, [...commonArgs, '--if-exists', throwawayDb], { env });
  }
}

runRestoreTest()
  .then((outcome) => {
    console.table(outcome.results);
    if (!outcome.ok) {
      console.error('Restore verification FAILED - row counts do not match.');
      process.exit(1);
    }
    console.log('Restore verification passed - all table row counts match.');
  })
  .catch((err) => {
    console.error('Restore test failed:', err.message);
    process.exit(1);
  });
