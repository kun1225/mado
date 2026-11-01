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

import { openLibrary } from './library-records.js';

let root;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mado-library-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function makeSource(id, overrides = {}) {
  return {
    id,
    name: `Source ${id}`,
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind: 'image',
    fileName: `${id}.webp`,
    mimeType: 'image/webp',
    sizeBytes: 10,
    width: 1,
    height: 1,
    durationSeconds: null,
    storageKey: id,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeCollection(id, overrides = {}) {
  return {
    id,
    name: `Collection ${id}`,
    parentId: null,
    color: null,
    saveCount: 0,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

const sourceFile = (id) => join(root, 'sources', `${id}.json`);

describe('openLibrary', () => {
  it('starts empty and creates the folders', async () => {
    const library = await openLibrary(root);

    assert.deepEqual(library.listSources(), []);
    assert.deepEqual(library.listCollections(), []);
    assert.deepEqual((await readdir(root)).sort(), ['media', 'sources']);
  });

  it('reads back what an earlier run wrote', async () => {
    const first = await openLibrary(root);
    await first.addSource(makeSource('a'));
    await first.putCollections([makeCollection('c1')]);

    const second = await openLibrary(root);

    assert.equal(second.getSource('a').name, 'Source a');
    assert.equal(second.getCollection('c1').name, 'Collection c1');
  });

  it('skips a broken file and reports it', async () => {
    const problems = [];
    await mkdir(join(root, 'sources'), { recursive: true });
    await writeFile(sourceFile('good'), JSON.stringify(makeSource('good')));
    await writeFile(sourceFile('broken'), '{ not json');
    await writeFile(
      sourceFile('wrong-id'),
      JSON.stringify(makeSource('other')),
    );

    const library = await openLibrary(root, {
      onProblem: (problem) => problems.push(problem.file),
    });

    assert.deepEqual(
      library.listSources().map((source) => source.id),
      ['good'],
    );
    assert.deepEqual(problems.sort(), ['broken.json', 'wrong-id.json']);
  });
});

describe('sources', () => {
  it('writes one file per source', async () => {
    const library = await openLibrary(root);

    await library.addSource(makeSource('a'));

    const saved = JSON.parse(await readFile(sourceFile('a'), 'utf8'));
    assert.equal(saved.id, 'a');
  });

  it('refuses to add an id twice', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));

    await assert.rejects(library.addSource(makeSource('a')), /already exists/);
  });

  it('replaces a source with put and keeps the old object untouched', async () => {
    const library = await openLibrary(root);
    const original = makeSource('a');
    await library.addSource(original);

    await library.putSources([{ ...original, tags: ['calm'] }]);

    assert.deepEqual(library.getSource('a').tags, ['calm']);
    assert.deepEqual(original.tags, []);
    const saved = JSON.parse(await readFile(sourceFile('a'), 'utf8'));
    assert.deepEqual(saved.tags, ['calm']);
  });

  it('deletes the record and its file, and ignores a missing id', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));

    await library.deleteSources(['a', 'never-existed']);

    assert.equal(library.getSource('a'), undefined);
    assert.deepEqual(await readdir(join(root, 'sources')), []);
  });

  it('lists the sources of one collection, trash included', async () => {
    const library = await openLibrary(root);
    await library.putSources([
      makeSource('a', { collectionIds: ['c1'] }),
      makeSource('b', { collectionIds: ['c1', 'c2'], deletedAt: 'x' }),
      makeSource('c', { collectionIds: ['c2'] }),
    ]);

    const ids = library.listSourcesInCollection('c1').map((s) => s.id);

    assert.deepEqual(ids.sort(), ['a', 'b']);
  });

  it('keeps an unsafe id inside the sources folder', async () => {
    const library = await openLibrary(root);

    await library.addSource(makeSource('../../escape'));

    assert.deepEqual(await readdir(root), ['media', 'sources']);
    assert.equal((await readdir(join(root, 'sources'))).length, 1);
    const reopened = await openLibrary(root);
    assert.equal(reopened.getSource('../../escape').id, '../../escape');
  });

  it('leaves no temp files behind', async () => {
    const library = await openLibrary(root);

    await Promise.all(
      ['a', 'b', 'c'].map((id) => library.addSource(makeSource(id))),
    );

    const names = await readdir(join(root, 'sources'));
    assert.deepEqual(names.sort(), ['a.json', 'b.json', 'c.json']);
  });
});

describe('collections', () => {
  it('saves and deletes in collections.json', async () => {
    const library = await openLibrary(root);

    await library.putCollections([makeCollection('c1'), makeCollection('c2')]);
    await library.deleteCollections(['c1']);

    const saved = JSON.parse(
      await readFile(join(root, 'collections.json'), 'utf8'),
    );
    assert.deepEqual(
      saved.map((collection) => collection.id),
      ['c2'],
    );
    assert.equal(library.getCollection('c1'), undefined);
  });
});

describe('syncFromDisk', () => {
  it("ignores the app's own write", async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));

    assert.equal(await library.syncFromDisk('sources/a.json'), 'ignored');
  });

  it('picks up an agent editing the tags', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));

    const edited = { ...makeSource('a'), tags: ['calm', 'warm'] };
    await writeFile(sourceFile('a'), JSON.stringify(edited, null, 2));

    assert.equal(await library.syncFromDisk('sources/a.json'), 'updated');
    assert.deepEqual(library.getSource('a').tags, ['calm', 'warm']);
  });

  it('keeps the last good record when an edit is not valid', async () => {
    const problems = [];
    const library = await openLibrary(root, {
      onProblem: (problem) => problems.push(problem.file),
    });
    await library.addSource(makeSource('a'));

    await writeFile(sourceFile('a'), '{ "id": "a", "tags": "calm" }');

    assert.equal(await library.syncFromDisk('sources/a.json'), 'invalid');
    assert.deepEqual(library.getSource('a').tags, []);
    assert.deepEqual(problems, ['a.json']);
  });

  it('adds a source an agent created', async () => {
    const library = await openLibrary(root);

    await writeFile(sourceFile('new'), JSON.stringify(makeSource('new')));

    assert.equal(await library.syncFromDisk('sources/new.json'), 'updated');
    assert.equal(library.getSource('new').id, 'new');
  });

  it('removes a source whose file was deleted', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));

    await rm(sourceFile('a'));

    assert.equal(await library.syncFromDisk('sources/a.json'), 'updated');
    assert.equal(library.getSource('a'), undefined);
  });

  it('ignores a delete the app made itself', async () => {
    const library = await openLibrary(root);
    await library.addSource(makeSource('a'));
    await library.deleteSources(['a']);

    assert.equal(await library.syncFromDisk('sources/a.json'), 'ignored');
  });

  it('reloads collections.json after an outside edit', async () => {
    const library = await openLibrary(root);
    await library.putCollections([makeCollection('c1')]);

    await writeFile(
      join(root, 'collections.json'),
      JSON.stringify([makeCollection('c1', { name: 'Renamed' })]),
    );

    assert.equal(await library.syncFromDisk('collections.json'), 'updated');
    assert.equal(library.getCollection('c1').name, 'Renamed');
  });

  it('ignores files it does not own', async () => {
    const library = await openLibrary(root);

    assert.equal(await library.syncFromDisk('AGENTS.md'), 'ignored');
    assert.equal(await library.syncFromDisk('sources/a.json.tmp-1'), 'ignored');
  });
});
