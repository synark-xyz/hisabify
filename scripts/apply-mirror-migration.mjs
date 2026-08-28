#!/usr/bin/env node
/**
 * Applies `20260828000000_reset_stale_pro_mirror.sql` to the linked Supabase project, and
 * records it in `supabase_migrations.schema_migrations` so a future `db push` skips it.
 *
 * Deliberately **not** `supabase db push`: that would attempt 15 pending migrations against a
 * database that has drifted from the repo (tables that already exist paired with bare
 * `CREATE TABLE`, plain seed INSERTs), and would fail partway with production already mutated.
 * See APPLY_20260828000000.md.
 *
 * Needs a privileged connection string, since RLS blocks the anon key from touching other
 * users' rows. Supply one of:
 *   SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres'
 *
 * Prints the affected rows and exits non-zero if nothing matched, because an UPDATE that
 * quietly touches zero rows is indistinguishable from one that worked.
 *
 * Usage:
 *   SUPABASE_DB_URL=... node scripts/apply-mirror-migration.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = '20260828000000';
const NAME = 'reset_stale_pro_mirror';
const FILE = join(repoRoot, `supabase/migrations/${VERSION}_${NAME}.sql`);

const dbUrl = process.env.SUPABASE_DB_URL;
const dryRun = process.argv.includes('--dry-run');

if (!dbUrl) {
  console.error(
    [
      'SUPABASE_DB_URL is not set.',
      '',
      'This migration updates rows belonging to other users, which RLS blocks for the anon',
      'key, so it needs the database connection string:',
      '',
      '  Supabase dashboard -> Project Settings -> Database -> Connection string (URI)',
      '',
      "  SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres' \\",
      '    node scripts/apply-mirror-migration.mjs',
      '',
      'No credential? Run the SQL by hand instead — copy-paste steps are in',
      'supabase/migrations/APPLY_20260828000000.md',
    ].join('\n'),
  );
  process.exit(2);
}

let postgres;
try {
  ({ default: postgres } = await import('postgres'));
} catch {
  console.error(
    'The `postgres` package is not installed.\n' +
      'Either `npm i -D postgres`, or follow the manual steps in\n' +
      'supabase/migrations/APPLY_20260828000000.md',
  );
  process.exit(2);
}

const migrationSql = readFileSync(FILE, 'utf8');
const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

try {
  // Preview first: if this is empty the UPDATE would be a silent no-op, which usually means
  // the addresses in the migration don't match what's actually in the table.
  const before = await sql`
    SELECT user_id, email, subscription_type, subscription_status
    FROM public.users
    WHERE lower(btrim(email)) IN ('coxshebatech@gmail.com', 'sam103043@gmail.com')
  `;

  console.log(`matched ${before.length} row(s):`);
  for (const r of before) {
    console.log(`  ${r.email}  ${r.subscription_type}/${r.subscription_status}`);
  }

  if (before.length === 0) {
    console.error('\nNothing matched. Not applying: check the addresses in the migration.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDRY RUN: nothing was changed.');
    process.exit(0);
  }

  const stale = before.filter((r) => r.subscription_type === 'pro');
  if (stale.length === 0) {
    console.log('\nAlready corrected — no row is still marked pro. Recording as applied.');
  }

  // The UPDATE and the history row go together: a partial success here would leave the
  // migration looking un-applied and invite a confusing re-run.
  //
  // Comments are stripped before appending RETURNING: the file ends with a code line today,
  // but if a trailing `--` comment were ever added, the appended clause would land inside it
  // and silently vanish.
  const statement =
    migrationSql
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n')
      .trim()
      .replace(/;\s*$/, '') + ' RETURNING user_id, email, subscription_type, subscription_status';

  const updated = await sql.begin(async (tx) => {
    const rows = await tx.unsafe(statement);
    await tx`
      INSERT INTO supabase_migrations.schema_migrations (version, name)
      VALUES (${VERSION}, ${NAME})
      ON CONFLICT (version) DO NOTHING
    `;
    return rows;
  });

  console.log(`\nupdated ${updated.length} row(s):`);
  for (const r of updated) {
    console.log(`  ${r.email}  -> ${r.subscription_type}/${r.subscription_status}`);
  }
  console.log(`\nrecorded ${VERSION} in supabase_migrations.schema_migrations`);
} finally {
  await sql.end();
}
