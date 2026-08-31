/**
 * Runs the two storage migrations (20260831000000, 20260831000001) verbatim against a real
 * Postgres (PGlite), on a schema shaped like Supabase Storage, and asserts the RLS policies
 * actually permit and deny the right rows.
 *
 * This exists because the migration was otherwise unexercised: reading a policy predicate is
 * not the same as watching Postgres enforce it. The production bug was precisely an absent
 * INSERT policy, so the check that matters is "does an upload into someone else's folder get
 * refused, and does an upload into my own folder succeed".
 *
 * The `storage` schema is reconstructed here because PGlite has no Supabase extensions. That
 * is a substitute for production and is recorded as such — it validates the policy logic and
 * the migration's idempotency, not that production has been fixed.
 *
 * Usage: npm run verify:storage-policies
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(
  repoRoot,
  'supabase/migrations/20260831000000_fix_avatar_storage_policies.sql',
);

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

const results = [];
function check(name, actual, expected) {
  const ok = actual === expected;
  results.push({ name, ok, actual, expected });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${actual}, want ${expected})`}`);
}

const db = await PGlite.create();

// Minimal stand-in for the Supabase Storage schema the migration targets.
await db.exec(`
  CREATE SCHEMA storage;
  CREATE SCHEMA auth;

  CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean DEFAULT false
  );

  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text REFERENCES storage.buckets(id),
    name text NOT NULL,
    owner uuid
  );

  -- Supabase's real implementation: split the object path on '/'.
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] AS $$
    SELECT string_to_array(name, '/');
  $$ LANGUAGE sql IMMUTABLE;

  -- auth.uid() reads the request's JWT claim; a GUC is the standard local stand-in.
  CREATE FUNCTION auth.uid() RETURNS uuid AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$ LANGUAGE sql STABLE;

  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  CREATE ROLE authenticated;
  CREATE ROLE anon;
  GRANT USAGE ON SCHEMA storage, auth TO authenticated, anon;
  GRANT ALL ON storage.objects TO authenticated, anon;
  GRANT ALL ON storage.buckets TO authenticated, anon;
`);

// Reproduce the production symptom first: RLS on, no policies -> every insert refused.
await db.exec(`INSERT INTO storage.buckets (id, name, public) VALUES ('avatars','avatars',true);`);
async function tryInsert(uid, path, role = 'authenticated') {
  try {
    await db.exec('BEGIN');
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('avatars', $1)`, [path]);
    await db.exec('COMMIT');
    return 'allowed';
  } catch (err) {
    await db.exec('ROLLBACK');
    return /row-level security/i.test(err.message) ? 'denied' : `error: ${err.message}`;
  }
}

check('before the fix, upload is denied (reproduces the bug)', await tryInsert(ME, `${ME}/a.png`), 'denied');

// Apply the migration exactly as it will be pasted into the SQL editor.
const sql = readFileSync(MIGRATION, 'utf8');
await db.exec(sql);

check('own-folder upload is allowed', await tryInsert(ME, `${ME}/1.png`), 'allowed');
check("another user's folder is denied", await tryInsert(ME, `${OTHER}/1.png`), 'denied');
check('bucket-root upload is denied', await tryInsert(ME, '1.png'), 'denied');
check('unauthenticated upload is denied', await tryInsert(null, `${ME}/2.png`), 'denied');

// The path the app actually builds: `${user.id}/${Date.now()}.${ext}`.
check('app-shaped path is allowed', await tryInsert(ME, `${ME}/${Date.now()}.png`), 'allowed');

// Public read is what getPublicUrl() depends on.
await db.exec('BEGIN');
await db.exec('SET LOCAL ROLE anon');
const readable = await db.query(`SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='avatars'`);
await db.exec('COMMIT');
check('avatars are publicly readable', readable.rows[0].n > 0, true);

const isPublic = await db.query(`SELECT public FROM storage.buckets WHERE id='avatars'`);
check('bucket is public', isPublic.rows[0].public, true);

const policies = await db.query(
  `SELECT cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`,
);
check('four policies created', policies.rows.length, 4);

// Re-running must be a no-op, since it will be pasted by hand against a drifted database.
await db.exec(sql);
const after = await db.query(
  `SELECT cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects'`,
);
check('migration is idempotent', after.rows.length, 4);
check('still works after re-run', await tryInsert(ME, `${ME}/3.png`), 'allowed');

// A migration that passes vacuously is worthless: confirm the deny cases depend on the
// predicate by dropping the INSERT policy and watching the allow case flip to denied.
await db.exec(`DROP POLICY "Users can upload their own avatar" ON storage.objects;`);
check('removing the policy reintroduces the bug', await tryInsert(ME, `${ME}/4.png`), 'denied');
await db.exec(sql); // restore

// Drift case: the bucket exists but was created private. getPublicUrl() would then 400 even
// once uploads succeed, so the migration must force it back to public.
await db.exec(`UPDATE storage.buckets SET public = false WHERE id = 'avatars';`);
await db.exec(sql);
const repaired = await db.query(`SELECT public FROM storage.buckets WHERE id='avatars'`);
check('a private bucket is repaired to public', repaired.rows[0].public, true);

// Drift case: unrelated policies on storage.objects (receipts, feedback) must survive, since
// production shares this table across buckets.
await db.exec(`
  CREATE POLICY "Users can upload own feedback attachments" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'feedback-attachments');
`);
await db.exec(sql);
const others = await db.query(
  `SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
     AND policyname = 'Users can upload own feedback attachments'`,
);
check('unrelated bucket policies are left intact', others.rows.length, 1);

// ---------------------------------------------------------------------------------------
// 20260831000001: the other two buckets the app writes to but production is missing.
// ---------------------------------------------------------------------------------------
const BUCKETS_SQL = readFileSync(
  join(repoRoot, 'supabase/migrations/20260831000001_restore_missing_storage_buckets.sql'),
  'utf8',
);

async function tryInsertBucket(bucket, uid, path, role = 'authenticated') {
  try {
    await db.exec('BEGIN');
    await db.exec(`SET LOCAL ROLE ${role}`);
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ($1, $2)`, [bucket, path]);
    await db.exec('COMMIT');
    return 'allowed';
  } catch (err) {
    await db.exec('ROLLBACK');
    return /row-level security/i.test(err.message) ? 'denied' : `error: ${err.message}`;
  }
}

// Both buckets are absent, exactly as production reports NoSuchBucket.
const before = await db.query(
  `SELECT id FROM storage.buckets WHERE id IN ('feedback-attachments','support-attachments')`,
);
check('the two buckets are missing beforehand', before.rows.length, 0);

await db.exec(BUCKETS_SQL);

const created = await db.query(
  `SELECT id, public FROM storage.buckets WHERE id IN ('feedback-attachments','support-attachments') ORDER BY id`,
);
check('both buckets are created', created.rows.length, 2);
// useAppFeedback stores paths and expects signed URLs; a public bucket would leak them.
check('feedback bucket stays private', created.rows.find((r) => r.id === 'feedback-attachments').public, false);
// SupportPage calls getPublicUrl(); a private bucket would make every emailed link 400.
check('support bucket is public', created.rows.find((r) => r.id === 'support-attachments').public, true);

check(
  'feedback: own folder allowed',
  await tryInsertBucket('feedback-attachments', ME, `${ME}/1.png`),
  'allowed',
);
check(
  "feedback: another user's folder denied",
  await tryInsertBucket('feedback-attachments', ME, `${OTHER}/1.png`),
  'denied',
);
check(
  'support: signed-in user own folder allowed',
  await tryInsertBucket('support-attachments', ME, `${ME}/1-shot.png`),
  'allowed',
);
// SupportPage accepts submissions from signed-out users, filed under `anonymous/`.
check(
  'support: anonymous folder allowed (signed-out submissions)',
  await tryInsertBucket('support-attachments', null, 'anonymous/1-shot.png', 'anon'),
  'allowed',
);
check(
  "support: another user's folder denied",
  await tryInsertBucket('support-attachments', ME, `${OTHER}/1-shot.png`),
  'denied',
);

// `receipts` is intentionally not recreated: receipt images are inline data URLs.
const receipts = await db.query(`SELECT id FROM storage.buckets WHERE id = 'receipts'`);
check('receipts bucket deliberately not recreated', receipts.rows.length, 0);

await db.exec(BUCKETS_SQL);
const rerun = await db.query(
  `SELECT id FROM storage.buckets WHERE id IN ('feedback-attachments','support-attachments')`,
);
check('bucket migration is idempotent', rerun.rows.length, 2);
// The avatar policies must survive the second migration running after them.
check('avatar upload still works after both migrations', await tryInsert(ME, `${ME}/5.png`), 'allowed');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
