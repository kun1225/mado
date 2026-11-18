import { readFile, rename, unlink, writeFile } from 'node:fs/promises';

let tempCounter = 0;

/** A crash in the middle leaves the old file, never half a new one. */
export async function writeAtomic(path, text) {
  const temp = `${path}.tmp-${process.pid}-${tempCounter++}`;
  await writeFile(temp, text);
  await rename(temp, path);
}

export async function readTextOrNull(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function removeIfExists(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Indented with a final newline, so a person or an agent reads it easily. */
export function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
