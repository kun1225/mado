import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { openLibrary } from './library-records.js';
import { watchLibrary } from './library-watcher.js';

let root;
let stop;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mado-watch-'));
  stop = () => {};
});

afterEach(async () => {
  stop();
  await rm(root, { recursive: true, force: true });
});

function makeSource(id, tags = []) {
  return {
    id,
    name: id,
    kind: 'image',
    tags,
    collectionIds: [],
    createdAt: 'x',
    updatedAt: 'x',
    deletedAt: null,
  };
}

function waitFor(condition, ms = 3000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > ms) {
        clearInterval(timer);
        reject(new Error('Timed out'));
      }
    }, 20);
  });
}

describe('watchLibrary', () => {
  it('reports a source file an agent edited', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));
    const changes = [];
    stop = watchLibrary(root, library, (kind) => changes.push(kind));

    await writeFile(
      join(root, 'sources', 'a.json'),
      JSON.stringify(makeSource('a', ['calm'])),
    );
    await waitFor(() => changes.length > 0);

    assert.deepEqual(changes, ['sources']);
    assert.deepEqual(library.getSource('a').tags, ['calm']);
  });

  it("stays quiet about the app's own writes", async () => {
    const library = await openLibrary(root);
    const changes = [];
    stop = watchLibrary(root, library, (kind) => changes.push(kind));

    await library.addSource(makeSource('a'));
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.deepEqual(changes, []);
  });

  it('stays quiet about media files', async () => {
    const library = await openLibrary(root);
    const changes = [];
    stop = watchLibrary(root, library, (kind) => changes.push(kind));

    await writeFile(join(root, 'media', 'a'), 'bytes');
    await new Promise((resolve) => setTimeout(resolve, 500));

    assert.deepEqual(changes, []);
  });
});
