import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { readTextOrNull } from './library-files.js';

const LIBRARY_FOLDER_NAME = 'Mado Library';
const COLLECTIONS_FILE = 'collections.json';
// The old app's lock (and its temp file) would block the new folder, and a
// record (`.tmp-<pid>-<n>`) or media (`.tmp-<uuid>`) temp file is half a write.
const SKIP_ON_COPY = /(^|\/)\.mado-lock(\.\d+-\d+)?$|\.tmp-[\w-]+$/;

/**
 * Remembers which folder holds the user's library.
 *
 * `pickFolder` opens the folder picker and resolves to a path, or null when the
 * user closes it. It is a parameter so the real dialog stays out of the tests.
 * `confirmCopy({ from, to })` asks whether to copy the current library into an
 * empty new folder, and resolves to 'copy', 'empty', or null to cancel.
 *
 * `getStatus`, `choose` and `recreate` resolve to `{ status: 'none' | 'missing' | 'ready', path }`.
 */
export function createLibraryFolder({
  configPath,
  pickFolder,
  confirmCopy,
  defaultRoot,
}) {
  return {
    getStatus: () => getStatus(configPath, defaultRoot),
    choose: () => choose({ configPath, pickFolder, confirmCopy, defaultRoot }),
    recreate: () => recreate(configPath, defaultRoot),
  };
}

// *** recreate ***
// Only runs when the user asks, so the app never makes an empty library on its own.
async function recreate(configPath, defaultRoot) {
  const config = await readConfig(configPath);
  if (!config) return getStatus(configPath, defaultRoot);

  await makeLibrary(config.libraryRoot);
  return { status: 'ready', path: config.libraryRoot };
}

// *** choose ***
async function choose({ configPath, pickFolder, confirmCopy, defaultRoot }) {
  const picked = await pickFolder();
  if (picked === null) return null;

  // Picking an existing library opens it, so libraries never nest.
  const root =
    picked === defaultRoot || basename(picked) === LIBRARY_FOLDER_NAME
      ? picked
      : join(picked, LIBRARY_FOLDER_NAME);

  if (!(await offerCopy(configPath, root, confirmCopy))) return null;

  await makeLibrary(root);
  await writeConfig(configPath, { libraryRoot: root });

  return { status: 'ready', path: root };
}

// *** offerCopy ***
// Resolves to false when the user cancels. Copies, not moves: the old files stay until the user removes them.
async function offerCopy(configPath, root, confirmCopy) {
  const from = (await readConfig(configPath))?.libraryRoot;
  if (!from || from === root) return true;
  if (!(await hasRecords(from)) || (await isLibrary(root))) return true;

  const answer = await confirmCopy({ from, to: root });
  if (answer === 'copy') await copyLibrary(from, root);
  return answer !== null;
}

// *** copyLibrary ***
// Copied beside the new folder and renamed into place in one step, so the new
// folder is either the whole library or not there.
async function copyLibrary(from, to) {
  // A new name each time, so a folder that happens to have the same name is never removed.
  const staging = await mkdtemp(`${to}.copying-`);

  try {
    await cp(from, staging, {
      recursive: true,
      filter: (path) => !SKIP_ON_COPY.test(path),
    });
    await removeEmptyLibrary(to);
    await rename(staging, to);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

// *** removeEmptyLibrary ***
// The new folder may hold an empty library made before. Only empty folders and
// our own guide go, so a file of the user's stops the copy instead of being lost.
async function removeEmptyLibrary(root) {
  if (!(await isDirectory(root))) return;

  await removeEmptyDirectory(join(root, 'sources'));
  await removeEmptyDirectory(join(root, 'media'));
  const guide = join(root, 'AGENTS.md');
  if ((await readTextOrNull(guide)) === AGENT_GUIDE) await rm(guide);
  await rmdir(root);
}

// *** removeEmptyDirectory ***
async function removeEmptyDirectory(path) {
  try {
    await rmdir(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// *** isLibrary ***
// A label or a lock means an app opened it, even when it has no records yet.
async function isLibrary(root) {
  return (
    (await hasRecords(root)) ||
    (await isFile(join(root, 'mado.json'))) ||
    (await isFile(join(root, '.mado-lock')))
  );
}

// *** hasRecords ***
async function hasRecords(root) {
  if (await isFile(join(root, COLLECTIONS_FILE))) return true;
  try {
    return (await readdir(join(root, 'sources'))).length > 0;
  } catch {
    return false;
  }
}

// *** getStatus ***
async function getStatus(configPath, defaultRoot) {
  const config = await readConfig(configPath);
  if (!config) {
    if (!defaultRoot) return { status: 'none', path: null };

    await makeLibrary(defaultRoot);
    await writeConfig(configPath, { libraryRoot: defaultRoot });
    return { status: 'ready', path: defaultRoot };
  }

  const exists = await isDirectory(config.libraryRoot);
  return { status: exists ? 'ready' : 'missing', path: config.libraryRoot };
}

// *** makeLibrary ***
async function makeLibrary(root) {
  await mkdir(join(root, 'sources'), { recursive: true });
  await mkdir(join(root, 'media'), { recursive: true });
  await writeAgentGuide(root);
}

// *** readConfig ***
async function readConfig(configPath) {
  try {
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    return typeof config.libraryRoot === 'string' ? config : null;
  } catch {
    // A missing or broken config only means we ask the user again.
    return null;
  }
}

// *** writeConfig ***
async function writeConfig(configPath, config) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

// *** isFile ***
async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

// *** isDirectory ***
async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

// *** writeAgentGuide ***
// `wx` fails when the file exists, so a guide the user edited is never overwritten.
async function writeAgentGuide(root) {
  try {
    await writeFile(join(root, 'AGENTS.md'), AGENT_GUIDE, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

const AGENT_GUIDE = `# Mado library

This folder is a Mado library. Mado reloads a record when you edit its file.

## Files

- \`sources/<id>.json\`: one source (an image, video, website or text).
- \`collections.json\`: every collection.
- \`media/<storageKey>\`: the files themselves. Read them, but never edit, rename or delete them.
- \`mado.json\` and \`.mado-lock\`: Mado's own. Never edit or delete them.

## Rules

- Keep every record valid JSON, with the fields it already has.
- You may change \`name\`, \`note\`, \`tags\` (a list of short lowercase words) and \`collectionIds\`.
- When you change a record, set \`updatedAt\` to the current time in ISO 8601.
- Never change \`id\`, \`storageKey\`, \`kind\`, \`createdAt\`, or the file and size fields.
- A collection with \`deletedAt\` set is deleted. Leave it in the list, and never add a source to it.
- Edit one record at a time, and leave the other files alone.
`;
