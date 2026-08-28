#!/usr/bin/env node
/**
 * Executes the stale-pro-mirror migration against a throwaway database that carries the real
 * CHECK constraint from `20260124000000_rename_profiles_to_users.sql`.
 *
 * This is not a substitute for running it on production, but it does pin the properties that
 * make an UPDATE migration dangerous or useless:
 *   - does it hit the rows it should?
 *   - does it leave every other row alone?
 *   - is it safe to run twice?
 *   - does it silently match nothing because of email casing?
 *
 * A migration that quietly updates zero rows is indistinguishable from one that worked, which
 * is precisely why the casing case is asserted rather than assumed.
 *
 * Usage: node scripts/verify-mirror-migration.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = join(repo, 'supabase/migrations/20260828000000_reset_stale_pro_mirror.sql');

/** Strip comments and translate the Postgres-isms sqlite doesn't share. */
function migrationBody() {
  return readFileSync(MIGRATION, 'utf8')
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .replace(/NOW\(\)/g, "'t1'")
    .replace(/public\.users/g, 'users')
    .replace(/btrim\(/g, 'trim(');
}

function freshDb(rows) {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      user_id TEXT PRIMARY KEY,
      email TEXT,
      subscription_type TEXT DEFAULT 'base' CHECK (subscription_type IN ('base','pro')),
      subscription_status TEXT DEFAULT 'inactive',
      updated_at TEXT
    );
  `);
  for (const r of rows) {
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(...r);
  }
  return db;
}

const snapshot = (db) =>
  db
    .prepare('SELECT email, subscription_type, subscription_status FROM users ORDER BY user_id')
    .all()
    .map((r) => `${r.email}=${r.subscription_type}/${r.subscription_status}`);

let failed = 0;
function check(label, cond, detail = '') {
  if (!cond) failed++;
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? `\n          ${detail}` : ''}`);
}

const body = migrationBody();

console.log('the two stale rows, plus rows that must not be touched');
{
  const db = freshDb([
    ['u1', 'coxshebatech@gmail.com', 'pro', 'active', 't0'],
    ['u2', 'sam103043@gmail.com', 'pro', 'active', 't0'],
    ['u3', 'realpayer@example.com', 'pro', 'active', 't0'],
    ['u4', 'freeuser@example.com', 'base', 'inactive', 't0'],
  ]);
  db.exec(body);
  const s = snapshot(db);
  check('coxshebatech downgraded', s.includes('coxshebatech@gmail.com=base/inactive'));
  check('sam103043 downgraded', s.includes('sam103043@gmail.com=base/inactive'));
  check('unrelated paying customer untouched', s.includes('realpayer@example.com=pro/active'));
  check('already-free user untouched', s.includes('freeuser@example.com=base/inactive'));

  const before = snapshot(db);
  db.exec(body);
  check('re-running changes nothing', JSON.stringify(before) === JSON.stringify(snapshot(db)));
}

console.log('\nemail casing and padding must not silently no-op');
{
  const db = freshDb([
    ['u1', 'CoxShebaTech@gmail.com', 'pro', 'active', 't0'],
    ['u2', ' sam103043@gmail.com ', 'pro', 'active', 't0'],
  ]);
  db.exec(body);
  const stillPro = db.prepare("SELECT email FROM users WHERE subscription_type='pro'").all();
  check(
    'mixed-case and padded addresses are matched',
    stillPro.length === 0,
    stillPro.length ? `still pro: ${stillPro.map((r) => JSON.stringify(r.email)).join(', ')}` : '',
  );
}

console.log("\nthe column's CHECK constraint rejects 'free'");
{
  const db = freshDb([['u1', 'a@b.c', 'base', 'inactive', 't0']]);
  let rejected = false;
  try {
    db.exec("UPDATE users SET subscription_type='free' WHERE user_id='u1'");
  } catch {
    rejected = true;
  }
  check("'free' is not a legal subscription_type, only 'base'/'pro'", rejected);
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}: ${failed} failing check(s)`);
process.exit(failed === 0 ? 0 : 1);
