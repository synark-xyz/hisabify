/**
 * Spins up a real Postgres (PGlite over the wire protocol) seeded to look like production,
 * then runs `scripts/apply-mirror-migration.mjs` against it **as a subprocess** — the real
 * script, unmodified, over a real socket.
 *
 * This exists because the applier's connected path was otherwise unexercised: its guards were
 * tested but nothing had ever watched it talk to a database. An applier that has never
 * connected is a guess.
 *
 * Two constraints make this fiddly, and both cause an identical CONNECT_TIMEOUT:
 *   - the server runs in *this* process, so the subprocess must be spawned asynchronously.
 *     `execFileSync` blocks the event loop, leaving nothing to answer the connection.
 *   - PGlite serves one connection at a time, so the server is only up for the duration of
 *     each run and inspection queries read the PGlite instance directly.
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = 55432;

const db = await PGlite.create();

// Shape of production that matters here: the CHECK constraint and the migrations table.
await db.exec(`
  CREATE TABLE public.users (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text,
    subscription_type text DEFAULT 'base' CHECK (subscription_type IN ('base','pro')),
    subscription_status text DEFAULT 'inactive',
    updated_at timestamptz DEFAULT now()
  );
  CREATE SCHEMA IF NOT EXISTS supabase_migrations;
  CREATE TABLE supabase_migrations.schema_migrations (
    version text PRIMARY KEY,
    name text
  );
  INSERT INTO public.users (email, subscription_type, subscription_status) VALUES
    ('coxshebatech@gmail.com','pro','active'),
    ('sam103043@gmail.com','pro','active'),
    ('realpayer@example.com','pro','active'),
    ('freeuser@example.com','base','inactive');
`);

const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`;

/** Run the real applier as a subprocess, with the socket server up only for its lifetime. */
async function run(args = []) {
  const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1' });
  await server.start();
  try {
    const { stdout } = await execFileAsync('node', ['scripts/apply-mirror-migration.mjs', ...args], {
      encoding: 'utf8',
      env: { ...process.env, SUPABASE_DB_URL: url },
    });
    return stdout;
  } finally {
    await server.stop();
  }
}

const state = async () =>
  (await db.query(
    'SELECT email, subscription_type, subscription_status FROM public.users ORDER BY email',
  )).rows.map((r) => `${r.email}=${r.subscription_type}/${r.subscription_status}`);

let failed = 0;
const check = (label, cond, detail = '') => {
  if (!cond) failed++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n          ${detail}` : ''}`);
};

try {
  console.log('dry run must not modify anything');
  const before = await state();
  const dry = await run(['--dry-run']);
  check('reports the 2 matched rows', (dry.match(/matched 2 row/) || []).length === 1, dry.trim());
  check('database is unchanged', JSON.stringify(before) === JSON.stringify(await state()));
  check(
    'nothing recorded in schema_migrations',
    (await db.query('SELECT * FROM supabase_migrations.schema_migrations')).rows.length === 0,
  );

  console.log('\nreal apply');
  const out = await run();
  const after = await state();
  check('coxshebatech downgraded', after.includes('coxshebatech@gmail.com=base/inactive'));
  check('sam103043 downgraded', after.includes('sam103043@gmail.com=base/inactive'));
  check('unrelated paying customer untouched', after.includes('realpayer@example.com=pro/active'));
  check('already-free user untouched', after.includes('freeuser@example.com=base/inactive'));
  check('reported updating 2 rows', /updated 2 row/.test(out), out.trim().split('\n').pop());

  const hist = await db.query('SELECT version, name FROM supabase_migrations.schema_migrations');
  check(
    'recorded 20260828000000 in schema_migrations',
    hist.rows.length === 1 && hist.rows[0].version === '20260828000000',
    JSON.stringify(hist.rows),
  );

  console.log('\nre-running is safe');
  const second = await run();
  check('second run changes nothing', JSON.stringify(after) === JSON.stringify(await state()));
  check('second run reports 0 updates', /updated 0 row/.test(second));
  check(
    'schema_migrations still has exactly one row',
    (await db.query('SELECT * FROM supabase_migrations.schema_migrations')).rows.length === 1,
  );
} finally {
  await db.close();
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}: ${failed} failing check(s)`);
process.exit(failed === 0 ? 0 : 1);
