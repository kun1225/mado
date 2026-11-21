import assert from 'node:assert/strict';
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createLibraryFolder } from './library-folder.js';

let base;
let configPath;

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), 'mado-folder-'));
  configPath = join(base, 'config', 'config.json');
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

function makeFolder(pickedPath) {
  return createLibraryFolder({
    configPath,
    pickFolder: async () => pickedPath,
  });
}

describe('getStatus', () => {
  it('creates and remembers the default library without opening the picker', async () => {
    const defaultRoot = join(base, 'Documents', 'mado');
    const folder = createLibraryFolder({
      configPath,
      defaultRoot,
      pickFolder: async () => assert.fail('The picker must not open'),
    });

    assert.deepEqual(await folder.getStatus(), {
      status: 'ready',
      path: defaultRoot,
    });
    assert.deepEqual((await readdir(defaultRoot)).sort(), [
      'AGENTS.md',
      'media',
      'sources',
    ]);
    assert.deepEqual(await makeFolder(null).getStatus(), {
      status: 'ready',
      path: defaultRoot,
    });

    await rm(defaultRoot, { recursive: true });
    assert.deepEqual(await folder.getStatus(), {
      status: 'missing',
      path: defaultRoot,
    });
  });

  it('keeps a chosen library when a default is available', async () => {
    const chosen = await makeFolder(base).choose();
    const folder = createLibraryFolder({
      configPath,
      defaultRoot: join(base, 'Documents', 'mado'),
      pickFolder: async () => null,
    });

    assert.deepEqual(await folder.getStatus(), chosen);
  });

  it('says none before a folder is chosen', async () => {
    const folder = makeFolder(null);

    assert.deepEqual(await folder.getStatus(), { status: 'none', path: null });
  });

  it('says ready after a folder is chosen, also in a new run', async () => {
    const parent = join(base, 'Documents');
    await mkdir(parent);
    await makeFolder(parent).choose();

    const status = await makeFolder(null).getStatus();

    assert.deepEqual(status, {
      status: 'ready',
      path: join(parent, 'Mado Library'),
    });
  });

  it('says missing when the saved folder is gone', async () => {
    const parent = join(base, 'Documents');
    await mkdir(parent);
    await makeFolder(parent).choose();
    await rm(join(parent, 'Mado Library'), { recursive: true });

    const status = await makeFolder(null).getStatus();

    assert.deepEqual(status, {
      status: 'missing',
      path: join(parent, 'Mado Library'),
    });
  });

  it('treats a broken config file as none', async () => {
    await mkdir(join(base, 'config'));
    await writeFile(configPath, '{ not json');

    assert.deepEqual(await makeFolder(null).getStatus(), {
      status: 'none',
      path: null,
    });
  });
});

describe('choose', () => {
  it('creates the library folder with its subfolders and AGENTS.md', async () => {
    const parent = join(base, 'Documents');
    await mkdir(parent);

    const status = await makeFolder(parent).choose();

    const root = join(parent, 'Mado Library');
    assert.deepEqual(status, { status: 'ready', path: root });
    assert.deepEqual((await readdir(root)).sort(), [
      'AGENTS.md',
      'media',
      'sources',
    ]);
    assert.match(await readFile(join(root, 'AGENTS.md'), 'utf8'), /tags/);
  });

  it('does nothing when the picker is closed', async () => {
    const status = await makeFolder(null).choose();

    assert.equal(status, null);
    assert.deepEqual(await makeFolder(null).getStatus(), {
      status: 'none',
      path: null,
    });
  });

  it('opens a folder that is already a Mado Library instead of nesting', async () => {
    const existing = join(base, 'Mado Library');
    await mkdir(existing);

    const status = await makeFolder(existing).choose();

    assert.equal(status.path, existing);
    assert.deepEqual(await readdir(join(base)), ['Mado Library', 'config']);
  });

  it('brings an old AGENTS.md up to date on a normal start', async () => {
    const parent = join(base, 'Documents');
    const root = join(parent, 'Mado Library');
    await makeFolder(parent).choose();
    await writeFile(join(root, 'AGENTS.md'), 'old rules');

    await makeFolder(null).getStatus();

    assert.match(
      await readFile(join(root, 'AGENTS.md'), 'utf8'),
      /suggestedTags/,
    );
  });

  it('brings an old AGENTS.md up to date', async () => {
    const parent = join(base, 'Documents');
    const root = join(parent, 'Mado Library');
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), 'old rules');

    await makeFolder(parent).choose();

    assert.match(
      await readFile(join(root, 'AGENTS.md'), 'utf8'),
      /suggestedTags/,
    );
  });
});

describe('choose with an old library', () => {
  let oldRoot;
  let newParent;

  beforeEach(async () => {
    oldRoot = join(base, 'old', 'Mado Library');
    newParent = join(base, 'new');
    await mkdir(join(oldRoot, 'sources'), { recursive: true });
    await mkdir(join(oldRoot, 'media'), { recursive: true });
    await mkdir(newParent, { recursive: true });
    await writeFile(join(oldRoot, 'sources', 's1.json'), '{}');
    await writeFile(join(oldRoot, 'media', 'k1'), 'bytes');
    await writeFile(join(oldRoot, 'collections.json'), '[]');
    await writeFile(join(oldRoot, 'mado.json'), '{ "schemaVersion": 1 }');
    await writeFile(join(oldRoot, '.mado-lock'), '{ "pid": 1 }');
    await writeFile(join(oldRoot, 'sources', 's2.json.tmp-1-0'), 'half');
    await writeFile(
      join(oldRoot, 'media', 'k3.tmp-123e4567-e89b-12d3-a456-426614174000'),
      'half',
    );
    await writeFile(join(oldRoot, '.mado-lock.1-0'), '{ "pid": 1 }');
    await mkdir(join(base, 'config'), { recursive: true });
    await writeFile(configPath, JSON.stringify({ libraryRoot: oldRoot }));
  });

  function makeMover(answer, asked = []) {
    return createLibraryFolder({
      configPath,
      pickFolder: async () => newParent,
      confirmCopy: async (paths) => {
        asked.push(paths);
        return answer;
      },
    });
  }

  it('copies the library into an empty folder and keeps the old one', async () => {
    const newRoot = join(newParent, 'Mado Library');
    const asked = [];

    assert.deepEqual(await makeMover('copy', asked).choose(), {
      status: 'ready',
      path: newRoot,
    });
    assert.deepEqual(asked, [{ from: oldRoot, to: newRoot }]);
    assert.equal(await readFile(join(newRoot, 'media', 'k1'), 'utf8'), 'bytes');
    assert.deepEqual(await readdir(join(newRoot, 'sources')), ['s1.json']);
    assert.ok((await readdir(newRoot)).includes('mado.json'));
    // The old app's lock would block the new folder.
    assert.ok(
      !(await readdir(newRoot)).some((name) => name.startsWith('.mado-lock')),
    );
    assert.ok((await readdir(join(oldRoot, 'media'))).includes('k1'));
  });

  it('leaves nothing behind when the copy fails, so a retry asks again', async () => {
    const newRoot = join(newParent, 'Mado Library');
    const unreadable = join(oldRoot, 'media', 'k2');
    await writeFile(unreadable, 'secret');
    await chmod(unreadable, 0o000);
    const asked = [];

    try {
      await assert.rejects(makeMover('copy', asked).choose());
    } finally {
      await chmod(unreadable, 0o644);
    }
    assert.deepEqual(await readdir(newParent), []);

    await makeMover('copy', asked).choose();
    assert.equal(asked.length, 2);
    assert.deepEqual(await readdir(join(newRoot, 'media')), ['k1', 'k2']);
  });

  it('copies over an empty library the app made there before', async () => {
    const newRoot = join(newParent, 'Mado Library');
    await mkdir(join(newRoot, 'sources'), { recursive: true });
    await mkdir(join(newRoot, 'media'), { recursive: true });

    await makeMover('copy').choose();

    assert.deepEqual(await readdir(join(newRoot, 'sources')), ['s1.json']);
  });

  it('copies over an empty library that has an older guide', async () => {
    const newRoot = join(newParent, 'Mado Library');
    await mkdir(join(newRoot, 'sources'), { recursive: true });
    await writeFile(join(newRoot, 'AGENTS.md'), 'old rules');

    await makeMover('copy').choose();

    assert.deepEqual(await readdir(join(newRoot, 'sources')), ['s1.json']);
  });

  it('keeps a file of the user in the new folder and stops the copy', async () => {
    const newRoot = join(newParent, 'Mado Library');
    await mkdir(newRoot, { recursive: true });
    await writeFile(join(newRoot, 'notes.txt'), 'mine');

    await assert.rejects(makeMover('copy').choose());

    assert.deepEqual(await readdir(newRoot), ['notes.txt']);
    assert.deepEqual(await readdir(newParent), ['Mado Library']);
  });

  it('never copies into a library another app has open or a newer app labeled', async () => {
    const newRoot = join(newParent, 'Mado Library');
    await mkdir(newRoot, { recursive: true });
    await writeFile(join(newRoot, 'mado.json'), '{ "schemaVersion": 99 }');
    const asked = [];

    await makeMover('copy', asked).choose();

    assert.deepEqual(asked, []);
    assert.equal(
      await readFile(join(newRoot, 'mado.json'), 'utf8'),
      '{ "schemaVersion": 99 }',
    );
  });

  it('leaves a folder of the same name as the staging folder alone', async () => {
    const other = join(newParent, 'Mado Library.copying');
    await mkdir(other, { recursive: true });
    await writeFile(join(other, 'keep.txt'), 'mine');

    await makeMover('copy').choose();

    assert.deepEqual(await readdir(other), ['keep.txt']);
  });

  it('starts an empty library when the user says so', async () => {
    const newRoot = join(newParent, 'Mado Library');

    await makeMover('empty').choose();

    assert.deepEqual(await readdir(join(newRoot, 'sources')), []);
    assert.deepEqual(await readdir(join(newRoot, 'media')), []);
  });

  it('changes nothing when the user cancels', async () => {
    assert.equal(await makeMover(null).choose(), null);
    assert.deepEqual(await makeMover(null).getStatus(), {
      status: 'ready',
      path: oldRoot,
    });
  });

  it('opens a folder that already has a library without asking', async () => {
    const newRoot = join(newParent, 'Mado Library');
    await mkdir(join(newRoot, 'sources'), { recursive: true });
    await writeFile(join(newRoot, 'sources', 'other.json'), '{}');
    const asked = [];

    await makeMover('copy', asked).choose();

    assert.deepEqual(asked, []);
    assert.deepEqual(await readdir(join(newRoot, 'sources')), ['other.json']);
  });

  it('does not ask when the same folder is picked again', async () => {
    const asked = [];
    const folder = createLibraryFolder({
      configPath,
      pickFolder: async () => oldRoot,
      confirmCopy: async (paths) => asked.push(paths),
    });

    await folder.choose();

    assert.deepEqual(asked, []);
  });
});

describe('recreate', () => {
  it('makes the saved folder again at the same path', async () => {
    const root = join(base, 'Mado Library');
    await makeFolder(base).choose();
    await rm(root, { recursive: true });

    assert.deepEqual(await makeFolder(null).recreate(), {
      status: 'ready',
      path: root,
    });
    assert.deepEqual((await readdir(root)).sort(), [
      'AGENTS.md',
      'media',
      'sources',
    ]);
    assert.deepEqual(await makeFolder(null).getStatus(), {
      status: 'ready',
      path: root,
    });
  });

  it('asks the user again when no folder was saved', async () => {
    assert.deepEqual(await makeFolder(null).recreate(), {
      status: 'none',
      path: null,
    });
  });
});
