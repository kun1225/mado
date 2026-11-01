import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const LIBRARY_FOLDER_NAME = 'Mado Library';

/**
 * Remembers which folder holds the user's library.
 *
 * `pickFolder` opens the folder picker and resolves to a path, or null when the
 * user closes it. It is a parameter so the real dialog stays out of the tests.
 *
 * `getStatus` and `choose` resolve to `{ status: 'none' | 'missing' | 'ready', path }`.
 */
export function createLibraryFolder({ configPath, pickFolder }) {
  return {
    getStatus: () => getStatus(configPath),
    choose: () => choose({ configPath, pickFolder }),
  };
}

// *** choose ***
async function choose({ configPath, pickFolder }) {
  const picked = await pickFolder();
  if (picked === null) return null;

  // Picking an existing library opens it, so libraries never nest.
  const root =
    basename(picked) === LIBRARY_FOLDER_NAME
      ? picked
      : join(picked, LIBRARY_FOLDER_NAME);

  await mkdir(join(root, 'sources'), { recursive: true });
  await mkdir(join(root, 'media'), { recursive: true });
  await writeAgentGuide(root);
  await writeConfig(configPath, { libraryRoot: root });

  return { status: 'ready', path: root };
}

// *** getStatus ***
async function getStatus(configPath) {
  const config = await readConfig(configPath);
  if (!config) return { status: 'none', path: null };

  const exists = await isDirectory(config.libraryRoot);
  return { status: exists ? 'ready' : 'missing', path: config.libraryRoot };
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

## Rules

- Keep every record valid JSON, with the fields it already has.
- You may change \`name\`, \`note\`, \`tags\` (a list of short lowercase words) and \`collectionIds\`.
- When you change a record, set \`updatedAt\` to the current time in ISO 8601.
- Never change \`id\`, \`storageKey\`, \`kind\`, \`createdAt\`, or the file and size fields.
- Edit one record at a time, and leave the other files alone.
`;
