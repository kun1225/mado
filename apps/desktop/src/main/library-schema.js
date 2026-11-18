import { join } from 'node:path';

import {
  readTextOrNull,
  toJson,
  tryParse,
  writeAtomic,
} from './library-files.js';

const SCHEMA_FILE = 'mado.json';

/** Raise it together with a new entry in `MIGRATIONS`. */
export const SCHEMA_VERSION = 1;

/**
 * Keyed by the version each step moves the folder to: `{ 2: async (root) => … }`.
 * A step must be safe to run twice, because a crash before the version is
 * written runs it again.
 */
const MIGRATIONS = {};

/**
 * Brings the folder's files up to `SCHEMA_VERSION` before anything reads them.
 * Resolves to `{ ok: true }`, or `{ ok: false, reason: 'needs-update' | 'invalid' }`
 * when the folder must not be touched. The options exist for the tests.
 */
export async function prepareSchema(
  root,
  { version = SCHEMA_VERSION, migrations = MIGRATIONS } = {},
) {
  const path = join(root, SCHEMA_FILE);
  const stored = await readStoredVersion(path);

  if (stored === 'invalid') return { ok: false, reason: 'invalid' };
  // A folder from before `mado.json` has the first shape.
  const current = stored ?? 1;
  // A newer app wrote these files, and this one can't know their shape.
  if (current > version) return { ok: false, reason: 'needs-update' };

  for (let next = current + 1; next <= version; next++) {
    await migrations[next](root);
  }
  // Written last, so a failed step leaves the old version and runs again.
  if (stored !== version) {
    await writeAtomic(path, toJson({ schemaVersion: version }));
  }
  return { ok: true };
}

// *** readStoredVersion ***
// Guessing a version for a broken file could migrate files that are already in a newer shape.
async function readStoredVersion(path) {
  let text;
  try {
    text = await readTextOrNull(path);
  } catch {
    return 'invalid';
  }
  if (text === null) return null;

  const version = tryParse(text)?.schemaVersion;
  return Number.isInteger(version) && version >= 1 ? version : 'invalid';
}
