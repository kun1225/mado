import assert from 'node:assert/strict';
import {
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

  it('keeps an AGENTS.md the user already edited', async () => {
    const parent = join(base, 'Documents');
    const root = join(parent, 'Mado Library');
    await mkdir(root, { recursive: true });
    await writeFile(join(root, 'AGENTS.md'), 'my rules');

    await makeFolder(parent).choose();

    assert.equal(await readFile(join(root, 'AGENTS.md'), 'utf8'), 'my rules');
  });
});
