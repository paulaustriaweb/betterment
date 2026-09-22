/**
 * Fixes bugs in expo-sqlite 57's web sync bridge. Runs from postinstall.
 *
 * This is a plain string replacement rather than patch-package because a .patch
 * applies by matching surrounding context, which held locally and failed on the
 * CI runner — taking every deploy with it. Exact replacement either matches or
 * says so, identically everywhere.
 *
 * 1. The length header of a sync result was written with
 *    `Uint8Array.set(new Uint32Array([length]))`, which converts element-wise and
 *    writes a single byte. Results of 256 bytes or more came back truncated to
 *    `length % 256`, i.e. JSON cut mid-token.
 * 2. The wait for the worker was budgeted at 1,000,000 `Atomics.pause()` calls,
 *    about 20-40ms. An OPFS flush on a phone takes longer, so writes threw
 *    "Sync operation timeout" after the worker had already committed them.
 *
 * Re-check both on any expo-sqlite upgrade. If upstream has fixed them, delete
 * this script and the postinstall hook rather than carrying it forward.
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
  {
    name: 'iteration-count timeout',
    find: `  while (Atomics.load(lock, 0) === PENDING) {
    ++i;

    if (useAtomicsPause) {
      if (i > 1_000_000) {
        throw new Error('Sync operation timeout');
      }
      // @ts-expect-error: Remove this when TypeScript supports Atomics.pause
      Atomics.pause();
    } else {
      // NOTE(kudo): Unfortunate for the busy loop,
      // because we don't have a way for main thread to yield its execution to other callbacks.
      if (i > 1000_000_000) {
        throw new Error('Sync operation timeout');
      }
    }
  }`,
    replace: `  const deadline = Date.now() + 5000;
  while (Atomics.load(lock, 0) === PENDING) {
    // Reading the clock every iteration would cost more than the pause it replaces.
    if ((++i & 0xffff) === 0 && Date.now() > deadline) {
      throw new Error('Sync operation timeout');
    }

    if (useAtomicsPause) {
      // @ts-expect-error: Remove this when TypeScript supports Atomics.pause
      Atomics.pause();
    }
  }`,
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
