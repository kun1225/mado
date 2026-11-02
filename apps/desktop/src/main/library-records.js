import {
  mkdir,
  readdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

const SOURCES_DIRECTORY = 'sources';
const MEDIA_DIRECTORY = 'media';
const COLLECTIONS_FILE = 'collections.json';
const SOURCE_PATH = /^sources\/([^/]+)\.json$/;

/**
 * Opens the records of one library folder: one JSON file per source and one
 * `collections.json`. Everything is kept in memory, so reads never touch the disk.
 *
 * `onProblem({ file, reason })` is called for a file that can't be used. A bad
 * file is skipped and never stops the library from opening.
 */
export async function openLibrary(root, { onProblem = () => {} } = {}) {
  await mkdir(join(root, SOURCES_DIRECTORY), { recursive: true });
  await mkdir(join(root, MEDIA_DIRECTORY), { recursive: true });

  const state = {
    root,
    onProblem,
    sources: new Map(),
    collections: new Map(),
    // The last text we wrote per file (null after a delete), so the watcher can tell our own writes from an agent's.
    written: new Map(),
    queue: Promise.resolve(),
  };
  await loadSources(state);
  await loadCollections(state);

  return {
    listSources: () => [...state.sources.values()],
    getSource: (id) => state.sources.get(id),
    listSourcesInCollection: (collectionId) =>
      [...state.sources.values()].filter((source) =>
        source.collectionIds.includes(collectionId),
      ),
    addSource: (source) => addSource(state, source),
    putSources: (sources) => putSources(state, sources),
    deleteSources: (ids) => deleteSources(state, ids),

    listCollections: () => [...state.collections.values()],
    getCollection: (id) => state.collections.get(id),
    putCollections: (collections) => putCollections(state, collections),
    deleteCollections: (ids) => deleteCollections(state, ids),

    syncFromDisk: (relativePath) => syncFromDisk(state, relativePath),
  };
}

// *** addSource ***
function addSource(state, source) {
  // The check runs inside the queue, so two adds of one id can't both pass it.
  return enqueue(state, async () => {
    if (state.sources.has(source.id)) {
      throw new Error(`Source already exists: ${source.id}`);
    }
    await saveSources(state, [source]);
  });
}

// *** putSources ***
function putSources(state, sources) {
  return enqueue(state, () => saveSources(state, sources));
}

// *** saveSources ***
// The index changes only after the file is saved, so a failed save never leaves a record that is not on disk.
async function saveSources(state, sources) {
  for (const source of sources) {
    const relativePath = toSourcePath(source.id);
    const text = toJson(source);
    await writeAtomic(join(state.root, relativePath), text);
    state.written.set(relativePath, text);
    state.sources.set(source.id, source);
  }
}

// *** deleteSources ***
function deleteSources(state, ids) {
  return enqueue(state, async () => {
    for (const id of ids) {
      const relativePath = toSourcePath(id);
      await removeIfExists(join(state.root, relativePath));
      state.written.set(relativePath, null);
      state.sources.delete(id);
    }
  });
}

// *** putCollections ***
function putCollections(state, collections) {
  return enqueue(state, () => {
    const next = new Map(state.collections);
    for (const collection of collections) next.set(collection.id, collection);
    return saveCollections(state, next);
  });
}

// *** deleteCollections ***
function deleteCollections(state, ids) {
  return enqueue(state, () => {
    const next = new Map(state.collections);
    for (const id of ids) next.delete(id);
    return saveCollections(state, next);
  });
}

// *** saveCollections ***
async function saveCollections(state, next) {
  const text = toJson([...next.values()]);
  await writeAtomic(join(state.root, COLLECTIONS_FILE), text);
  state.written.set(COLLECTIONS_FILE, text);
  state.collections = next;
}

/**
 * Reads one file again after something outside the app may have changed it, for
 * example an AI agent editing `tags`. Resolves to 'updated', 'ignored' or 'invalid'.
 * It waits behind our own writes, so it never reads a file we are still saving.
 */
function syncFromDisk(state, relativePath) {
  return enqueue(state, async () => {
    const sourceMatch = SOURCE_PATH.exec(relativePath);
    if (sourceMatch) return syncSource(state, relativePath, sourceMatch[1]);
    if (relativePath === COLLECTIONS_FILE) return syncCollections(state);
    return 'ignored';
  });
}

// *** syncSource ***
async function syncSource(state, relativePath, name) {
  const text = await readTextOrNull(join(state.root, relativePath));
  if (text === state.written.get(relativePath)) return 'ignored';

  const id = decodeId(name);
  if (text === null) {
    if (id === null || !state.sources.has(id)) return 'ignored';
    state.sources.delete(id);
    state.written.set(relativePath, null);
    return 'updated';
  }

  const record = tryParse(text);
  if (id === null || !isValidSource(record) || record.id !== id) {
    state.onProblem({ file: `${name}.json`, reason: 'Not a valid source.' });
    return 'invalid';
  }
  state.sources.set(record.id, record);
  state.written.set(relativePath, text);
  return 'updated';
}

// *** syncCollections ***
async function syncCollections(state) {
  const text = await readTextOrNull(join(state.root, COLLECTIONS_FILE));
  if (text === state.written.get(COLLECTIONS_FILE)) return 'ignored';

  const records = text === null ? [] : tryParse(text);
  if (!isValidCollectionList(records)) {
    state.onProblem({ file: COLLECTIONS_FILE, reason: 'Not a valid list.' });
    return 'invalid';
  }
  state.collections.clear();
  for (const collection of records) {
    state.collections.set(collection.id, collection);
  }
  state.written.set(COLLECTIONS_FILE, text);
  return 'updated';
}

// *** loadSources ***
async function loadSources(state) {
  const names = await readdir(join(state.root, SOURCES_DIRECTORY));

  for (const name of names.filter((entry) => entry.endsWith('.json'))) {
    const relativePath = `${SOURCES_DIRECTORY}/${name}`;
    const text = await readTextOrProblem(state, relativePath, name);
    const record = text === null ? null : tryParse(text);
    const id = decodeId(name.slice(0, -'.json'.length));

    if (text === null) continue;
    if (id === null || !isValidSource(record) || record.id !== id) {
      state.onProblem({ file: name, reason: 'Not a valid source.' });
      continue;
    }
    state.sources.set(record.id, record);
    state.written.set(relativePath, text);
  }
}

// *** readTextOrProblem ***
// A file we can't read (no permission, or a folder named like a record) is reported and skipped.
async function readTextOrProblem(state, relativePath, name) {
  try {
    return await readTextOrNull(join(state.root, relativePath));
  } catch (error) {
    state.onProblem({ file: name, reason: `Can't be read: ${error.code}` });
    return null;
  }
}

// *** loadCollections ***
async function loadCollections(state) {
  const text = await readTextOrProblem(
    state,
    COLLECTIONS_FILE,
    COLLECTIONS_FILE,
  );
  if (text === null) return;

  const records = tryParse(text);
  if (!isValidCollectionList(records)) {
    state.onProblem({ file: COLLECTIONS_FILE, reason: 'Not a valid list.' });
    return;
  }
  for (const collection of records) {
    state.collections.set(collection.id, collection);
  }
  state.written.set(COLLECTIONS_FILE, text);
}

// *** enqueue ***
// One write at a time, so two changes to the same file never race.
function enqueue(state, task) {
  const run = state.queue.then(task);
  state.queue = run.catch(() => {});
  return run;
}

let tempCounter = 0;

// *** writeAtomic ***
// A crash in the middle leaves the old file, never half a new one.
async function writeAtomic(path, text) {
  const temp = `${path}.tmp-${process.pid}-${tempCounter++}`;
  await writeFile(temp, text);
  await rename(temp, path);
}

// *** removeIfExists ***
async function removeIfExists(path) {
  try {
    await unlink(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// *** readTextOrNull ***
async function readTextOrNull(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// *** tryParse ***
function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// *** toJson ***
// Indented with a final newline, so a person or an agent reads it easily.
function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// *** toSourcePath ***
// Ids can be any string, so the file name is encoded and can never leave the folder.
function toSourcePath(id) {
  return `${SOURCES_DIRECTORY}/${encodeURIComponent(id)}.json`;
}

// *** decodeId ***
function decodeId(name) {
  try {
    return decodeURIComponent(name);
  } catch {
    return null;
  }
}

// *** isValidSource ***
// Only what the main process needs. The app checks the rest when it reads the record.
function isValidSource(record) {
  return (
    isObject(record) &&
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.kind === 'string' &&
    isStringList(record.tags) &&
    isStringList(record.collectionIds) &&
    typeof record.createdAt === 'string' &&
    typeof record.updatedAt === 'string' &&
    (record.deletedAt === null || typeof record.deletedAt === 'string')
  );
}

// *** isValidCollectionList ***
function isValidCollectionList(records) {
  return (
    Array.isArray(records) &&
    records.every(
      (record) =>
        isObject(record) &&
        typeof record.id === 'string' &&
        typeof record.name === 'string',
    )
  );
}

// *** isObject ***
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// *** isStringList ***
function isStringList(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}
