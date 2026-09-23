/**
 * Fixes a bug in expo-sqlite 57's web sync bridge. Runs from postinstall.
 *
 * This is a plain string replacement rather than patch-package because a .patch
 * applies by matching surrounding context, which held locally and failed on the
 * CI runner — taking every deploy with it. Exact replacement either matches or
 * says so, identically everywhere.
 *
 * The length header of a sync result was written with
 * `Uint8Array.set(new Uint32Array([length]))`, which converts element-wise and
 * writes a single byte. Results of 256 bytes or more came back truncated to
 * `length % 256`, i.e. JSON cut mid-token.
 *
 * The app no longer makes sync calls — every query is async — so this only guards
 * against a sync call creeping back in. A second fix, for the sync wait's timeout
 * budget, was dropped with the async migration: nothing waits on that loop now.
 *
 * Re-check on any expo-sqlite upgrade. If upstream has fixed it, delete this
 * script and the postinstall hook rather than carrying it forward.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'web', 'WorkerChannel.ts');

const REPLACEMENTS = [
  {
    name: 'length header written as one byte',
    find: `    resultArray.set(new Uint32Array([length]), 0);`,
    replace: `    new DataView(resultBuffer).setUint32(0, length, true);`,
  },
  {
    name: 'length header read back',
    find: `  const length = new Uint32Array(resultArray.buffer, 0, 1)[0];`,
    replace: `  const length = new DataView(resultArray.buffer).getUint32(0, true);`,
  },
];

function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`[patch-expo-sqlite] ${FILE} not found — did the package layout change?`);
    process.exit(1);
  }

  // Line endings are normalised so the match can't depend on how the file landed.
  const original = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

  // Each fix is checked on its own rather than against one "already done" marker.
  // CI restores a cached node_modules, so the file can arrive with some of these
  // applied and not others — a single marker failed the whole build on a copy that
  // was half patched by the previous release.
  let patched = original;
  let applied = 0;
  let skipped = 0;
  for (const { name, find, replace } of REPLACEMENTS) {
    if (patched.includes(replace)) {
      skipped += 1;
      continue;
    }
    if (!patched.includes(find)) {
      console.error(`[patch-expo-sqlite] could not find: ${name}`);
      console.error('[patch-expo-sqlite] expo-sqlite has changed. Re-check the bugs this fixes.');
      process.exit(1);
    }
    patched = patched.replace(find, replace);
    applied += 1;
  }

  if (patched !== original) fs.writeFileSync(FILE, patched, 'utf8');
  console.log(`[patch-expo-sqlite] ${applied} applied, ${skipped} already present`);
}

main();
