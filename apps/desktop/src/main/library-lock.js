import { link, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  readTextOrNull,
  removeIfExists,
  toJson,
  tryParse,
} from './library-files.js';

const LOCK_FILE = '.mado-lock';

/**
 * Claims the folder, so two apps (dev and packaged, or two Macs on one shared
 * drive) never write the same files. Resolves to `{ release }`, or null when
 * another running app holds the folder. The options exist for the tests.
 */
export async function acquireLock(
  root,
  { pid = process.pid, isAlive = isProcessAlive } = {},
) {
  const path = join(root, LOCK_FILE);
  const text = toJson({ pid });

  // Another app may take the lock over later, and its lock is not ours to remove.
  const lock = { release: () => removeIfUnchanged(path, text) };

  // Two tries: the second runs after a stale lock was removed.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (await createExclusive(path, text)) return lock;

    const held = await readTextOrNull(path);
    const owner = tryParse(held)?.pid;
    if (owner === pid) return lock;
    if (Number.isInteger(owner) && isAlive(owner)) return null;
    // The owner crashed, or the file is broken. Only that exact file is removed, and the next
    // `wx` lets one app win, so two apps that both found it stale can't both take the folder.
    await removeIfUnchanged(path, held);
  }
  return null;
}

let tempCounter = 0;

// *** createExclusive ***
// `link` fails when the file exists, so two apps can't both create it, and the
// lock appears with its text. A `wx` write is empty for a moment, and another
// app would take that for a broken lock and remove it.
async function createExclusive(path, text) {
  const temp = `${path}.${process.pid}-${tempCounter++}`;
  await writeFile(temp, text);
  try {
    await link(temp, path);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  } finally {
    await removeIfExists(temp);
  }
}

// *** removeIfUnchanged ***
async function removeIfUnchanged(path, text) {
  if ((await readTextOrNull(path)) === text) await removeIfExists(path);
}

// *** isProcessAlive ***
// Signal 0 only checks the process exists. EPERM means it exists but belongs to another user.
function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}
