import 'dotenv/config';
import { execFile } from 'child_process';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = path.join(__dirname, '..', 'backups');

// Dia 80: pg_dump isn't on PATH on this machine (two PostgreSQL installs
// coexist - 17 for this project on port 5433, 18 pre-existing/unrelated on
// the default port) - PG_DUMP_PATH lets this be pointed at whichever
// install's bin directory a given environment actually has, defaulting to
// this dev machine's real path rather than assuming it's global.
const PG_DUMP_PATH = process.env.PG_DUMP_PATH || 'C:/Program Files/PostgreSQL/17/bin/pg_dump.exe';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function createBackup() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set - cannot back up an unconfigured database.');
  }

  await mkdir(BACKUPS_DIR, { recursive: true });
  const file = path.join(BACKUPS_DIR, `techspeak-${timestamp()}.dump`);

  // Custom format (-Fc): compressed, and restorable directly with pg_restore
  // into a fresh database without needing the original plain-SQL file.
  await execFileAsync(PG_DUMP_PATH, ['-Fc', '-f', file, process.env.DATABASE_URL]);

  return file;
}

createBackup()
  .then((file) => console.log(`Backup written to ${file}`))
  .catch((err) => {
    console.error('Backup failed:', err.message);
    process.exit(1);
  });
