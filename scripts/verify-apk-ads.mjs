#!/usr/bin/env node
/**
 * Acceptance check for the staging ad-unit mismatch.
 *
 * Reads a *built APK* — not the source tree — and answers the only question that matters:
 * given this APK's real package name, which ad unit does its bundled JS actually request,
 * and does that unit's publisher match the AdMob application ID in its manifest?
 *
 * A publisher mismatch is exactly the bug that made ads vanish silently on staging:
 * AdMob refuses to serve a real unit under a foreign app ID, and useAdBanner swallows
 * the failure by design.
 *
 * Usage: node scripts/verify-apk-ads.mjs <apk> [<apk> ...]
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TEST_UNIT = 'ca-app-pub-3940256099942544/9214589741';

function findAapt2() {
  const root = join(process.env.HOME, 'Library/Android/sdk/build-tools');
  const versions = readdirSync(root).sort();
  return join(root, versions[versions.length - 1], 'aapt2');
}
const AAPT2 = findAapt2();

const dump = (apk, ...args) =>
  execFileSync(AAPT2, ['dump', ...args, apk], { encoding: 'utf8', maxBuffer: 1 << 28 });

const packageName = (apk) => dump(apk, 'packagename').trim();

function manifestAppId(apk) {
  const xml = dump(apk, 'xmltree', '--file', 'AndroidManifest.xml');
  const i = xml.indexOf('com.google.android.gms.ads.APPLICATION_ID');
  if (i < 0) return null;
  const m = xml.slice(i).match(/ca-app-pub-\d+~\d+/);
  return m ? m[0] : null;
}

/**
 * Evaluate the APK's own minified bundle to get the unit it would request at runtime.
 *
 * Minified identifiers change per build, so nothing is hardcoded: we locate the test-unit
 * constant, take the enclosing slice of top-level declarations, and evaluate it, then find
 * whichever exported function behaves like the resolver.
 */
function runtimeUnitId(apk, pkg) {
  const dir = mkdtempSync(join(tmpdir(), 'apk-ads-'));
  execFileSync('unzip', ['-q', apk, 'assets/public/assets/index-*.js', '-d', dir]);
  const assets = join(dir, 'assets/public/assets');
  // The build emits several `index-*.js` chunks; only one carries the ads module.
  let src = null;
  let at = -1;
  for (const f of readdirSync(assets).filter((f) => f.startsWith('index-') && f.endsWith('.js'))) {
    const text = readFileSync(join(assets, f), 'utf8');
    const idx = text.indexOf(TEST_UNIT);
    if (idx >= 0) {
      src = text;
      at = idx;
      break;
    }
  }
  if (at < 0) throw new Error('test-unit constant not found in any bundle chunk');

  // Widen to a window around the constant and keep only whole statements.
  const start = src.lastIndexOf('const ', at);
  const window = src.slice(start, at + 4000);

  // Collect candidate single-expression functions: `function X(a=null){return ...}`
  const candidates = [...window.matchAll(/function\s+(\w+)\s*\(\s*(\w+)\s*=\s*null\s*\)\s*\{return /g)];

  for (const c of candidates) {
    const name = c[1];
    // Evaluate everything from the constant up to just past this function.
    const end = window.indexOf('function ', c.index + 1);
    const seg = window.slice(0, end > 0 ? end : undefined).replace(/^const /, 'var ');
    try {
      // eslint-disable-next-line no-eval
      const val = eval(`${seg}; ${name}(${JSON.stringify(pkg)})`);
      if (typeof val === 'string' && val.startsWith('ca-app-pub-')) return val;
    } catch {
      /* not the resolver; try the next candidate */
    }
  }
  throw new Error('could not evaluate the ad-unit resolver from the bundle');
}

const publisher = (id) => (id ? id.split('-')[3].split(/[~/]/)[0] : null);

let failed = 0;
for (const apk of process.argv.slice(2)) {
  const pkg = packageName(apk);
  const appId = manifestAppId(apk);
  const unit = runtimeUnitId(apk, pkg);
  const [pa, pu] = [publisher(appId), publisher(unit)];
  const ok = pa !== null && pa === pu;
  if (!ok) failed++;

  console.log(`\n${apk}`);
  console.log(`  package name    ${pkg}`);
  console.log(`  manifest app ID ${appId}`);
  console.log(`  runtime ad unit ${unit}`);
  console.log(`  ${ok ? 'PASS' : 'FAIL'} publisher ${pa} vs ${pu}`);
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}: ${failed} variant(s) with a publisher mismatch`);
process.exit(failed === 0 ? 0 : 1);
