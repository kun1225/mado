import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The media files of one library, in `mediaRoot`. A file is written in chunks
 * to a temp name and appears under its real name only when it is complete.
 */
export async function createLibraryMedia(mediaRoot) {
  await mkdir(mediaRoot, { recursive: true });
  const writes = new Map();

  return {
    beginWrite: (key) => beginWrite({ mediaRoot, writes, key }),
    appendChunk: (writeId, bytes) => appendChunk(writes, writeId, bytes),
    finishWrite: (writeId) => finishWrite(writes, writeId),
    abortWrite: (writeId) => abortWrite(writes, writeId),
    remove: (key) => removeFile(toPath(mediaRoot, key)),
    resolvePath: (key) => toPath(mediaRoot, key),
  };
}

// *** beginWrite ***
async function beginWrite({ mediaRoot, writes, key }) {
  const finalPath = toPath(mediaRoot, key);
  const tempPath = `${finalPath}.tmp-${randomUUID()}`;
  const handle = await open(tempPath, 'w');
  const writeId = randomUUID();

  writes.set(writeId, { handle, tempPath, finalPath });
  return writeId;
}

// *** appendChunk ***
async function appendChunk(writes, writeId, bytes) {
  // `write` may save fewer bytes than given, but `writeFile` keeps going until all are saved.
  await getWrite(writes, writeId).handle.writeFile(Buffer.from(bytes));
}

// *** finishWrite ***
async function finishWrite(writes, writeId) {
  const { handle, tempPath, finalPath } = getWrite(writes, writeId);

  writes.delete(writeId);
  await handle.close();
  await rename(tempPath, finalPath);
}

// *** abortWrite ***
async function abortWrite(writes, writeId) {
  const write = writes.get(writeId);
  if (!write) return;

  writes.delete(writeId);
  await write.handle.close();
  await removeFile(write.tempPath);
}

// *** getWrite ***
function getWrite(writes, writeId) {
  const write = writes.get(writeId);
  if (!write) throw new Error(`Unknown write: ${writeId}`);
  return write;
}

// *** toPath ***
// The key is encoded, so it is one plain file name and can never leave the folder.
function toPath(mediaRoot, key) {
  const name = encodeURIComponent(key);
  if (name === '' || name === '.' || name === '..') {
    throw new Error(`Invalid media key: ${key}`);
  }
  return join(mediaRoot, name);
}

// *** removeFile ***
async function removeFile(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
