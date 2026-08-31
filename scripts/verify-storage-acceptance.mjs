/**
 * End-to-end acceptance check for the storage fix, against a REAL Supabase Storage instance
 * rather than a stub. Run alongside `verify-storage-policies.mjs`, which covers policy logic
 * on plain Postgres; this one covers the actual HTTP API and the app's own client calls.
 *
 * It replays `PersonalPage.handleAvatarUpload` through @supabase/supabase-js: getSession ->
 * upload (with contentType) -> getPublicUrl -> fetch, then asserts a cross-user upload is
 * refused. That is the sequence a user triggers by tapping the camera button.
 *
 * Setup (the repo's own `supabase start` currently fails on an unrelated migration, see
 * APPLY_20260831000000.md, so use a bare project):
 *
 *   mkdir -p /tmp/sbverify && cd /tmp/sbverify && npx supabase init && npx supabase start
 *   psql "$DB" -f supabase/migrations/20260831000000_fix_avatar_storage_policies.sql
 *   psql "$DB" -f supabase/migrations/20260831000001_restore_missing_storage_buckets.sql
 *   SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY=<publishable> \
 *     node scripts/verify-storage-acceptance.mjs
 *
 * Exits non-zero if the upload fails, the avatar is not publicly readable, or a cross-user
 * upload is permitted.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_KEY;
if (!key) {
  console.error('SUPABASE_KEY is required (the local publishable key from `supabase status`).');
  process.exit(2);
}
const supabase = createClient(url, key);

const email = `client${Math.floor(Math.random() * 1e6)}@example.com`;
const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
  email, password: 'Testpass123!',
});
if (signUpErr) throw signUpErr;
const user = signUp.user;

const { data: { session } } = await supabase.auth.getSession();
console.log('getSession ->', session ? 'active' : 'null');

const file = new File([new Uint8Array([137, 80, 78, 71])], 'me.PNG', { type: 'image/png' });
const fileExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
const filePath = `${user.id}/${Date.now()}.${fileExt || 'png'}`;

const { error: uploadError } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, { contentType: file.type, upsert: true });
console.log('upload ->', uploadError ? `FAILED: ${uploadError.message}` : 'OK');
if (uploadError) process.exit(1);

const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
const res = await fetch(publicUrl);
console.log('getPublicUrl ->', publicUrl.replace(/https?:\/\/[^/]+/, ''));
console.log('fetch avatar ->', `HTTP ${res.status}`, `${(await res.arrayBuffer()).byteLength}B`);
console.log('extension lowercased (me.PNG -> .png):', filePath.endsWith('.png'));

const { error: crossErr } = await supabase.storage
  .from('avatars')
  .upload('00000000-0000-0000-0000-000000000000/x.png', file, { contentType: 'image/png' });
console.log('cross-user upload ->', crossErr ? `denied (${crossErr.message})` : 'ALLOWED - BUG');

process.exit(res.status === 200 && !uploadError && crossErr ? 0 : 1);
