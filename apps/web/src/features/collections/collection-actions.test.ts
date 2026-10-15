import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from '../sources/source-types';

import type { UpdateCollectionInput } from './collection-types';

let createCollection: typeof import('./collection-actions').createCollection;
let deleteCollection: typeof import('./collection-actions').deleteCollection;
let fetchAllCollections: typeof import('./collection-actions').fetchAllCollections;
let fetchCollection: typeof import('./collection-actions').fetchCollection;
let updateCollection: typeof import('./collection-actions').updateCollection;
let pickPreviewSources: typeof import('./collection-actions').pickPreviewSources;
let openDatabase: typeof import('../storage/database').openDatabase;

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();

  ({
    createCollection,
    deleteCollection,
    fetchAllCollections,
    fetchCollection,
    updateCollection,
    pickPreviewSources,
  } = await import('./collection-actions'));

  ({ openDatabase } = await import('../storage/database'));
});

async function seedSource(collectionId: string | string[] | null, id: string) {
  const database = await openDatabase();
  const transaction = database.transaction('sources', 'readwrite');

  transaction.objectStore('sources').put({
    id,
    name: 'shot',
    url: null,
    note: null,
    tags: [],
    collectionIds: Array.isArray(collectionId)
      ? collectionId
      : collectionId
        ? [collectionId]
        : [],
    kind: 'image',
    fileName: 'shot.png',
    mimeType: 'image/png',
    sizeBytes: 1,
    width: null,
    height: null,
    durationSeconds: null,
    storageKey: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  });

  await new Promise((resolve) => {
    transaction.oncomplete = resolve;
  });
}

async function readSource(id: string) {
  const database = await openDatabase();
  const request = database
    .transaction('sources', 'readonly')
    .objectStore('sources')
    .get(id);

  return new Promise<Source>((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });
}

describe('createCollection', () => {
  it('defaults name to "New collection"', async () => {
    const collection = await createCollection();

    expect(collection.name).toBe('New collection');
    expect(collection.saveCount).toBe(0);
  });

  it('uses the provided name', async () => {
    const collection = await createCollection({ name: 'Reading list' });

    expect(collection.name).toBe('Reading list');
  });

  it('is top level by default', async () => {
    const collection = await createCollection();

    expect(collection.parentId).toBeNull();
  });

  it('nests under the given parent', async () => {
    const parent = await createCollection({ name: 'Parent' });

    const child = await createCollection({ parentId: parent.id });

    expect(child.parentId).toBe(parent.id);
    expect((await fetchCollection(child.id))?.parentId).toBe(parent.id);
  });

  it('throws and stores nothing when the parent does not exist', async () => {
    await expect(createCollection({ parentId: 'missing-id' })).rejects.toThrow(
      'Collection not found: missing-id',
    );
    expect(await fetchAllCollections()).toEqual([]);
  });
});

describe('fetchAllCollections', () => {
  it('returns collections sorted by updatedAt descending', async () => {
    await createCollection({ name: 'First' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createCollection({ name: 'Second' });

    const collections = await fetchAllCollections();

    expect(collections.map((c) => c.name)).toEqual(['Second', 'First']);
  });
});

describe('fetchCollection', () => {
  it('returns null when the collection does not exist', async () => {
    const collection = await fetchCollection('missing-id');

    expect(collection).toBeNull();
  });

  it('returns the matching collection', async () => {
    const created = await createCollection({ name: 'Reading list' });

    const collection = await fetchCollection(created.id);

    expect(collection).toEqual(created);
  });
});

describe('saveCount', () => {
  it("counts the collection's sources instead of the stored zero", async () => {
    const created = await createCollection({ name: 'Sites' });
    await seedSource(created.id, 'source-1');
    await seedSource(created.id, 'source-2');
    await seedSource(null, 'source-3');

    const fetched = await fetchCollection(created.id);
    const [listed] = await fetchAllCollections();

    expect(created.saveCount).toBe(0);
    expect(fetched?.saveCount).toBe(2);
    expect(listed.saveCount).toBe(2);
  });

  it('stays correct after renaming the collection', async () => {
    const created = await createCollection({ name: 'Sites' });
    await seedSource(created.id, 'source-1');

    const updated = await updateCollection(created.id, { name: 'Websites' });

    expect(updated.saveCount).toBe(1);
  });
});

describe('updateCollection', () => {
  it('merges input into the existing collection and bumps updatedAt', async () => {
    const created = await createCollection({ name: 'Old name' });

    const updated = await updateCollection(created.id, { name: 'New name' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('New name');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('throws when the collection does not exist', async () => {
    await expect(updateCollection('missing-id', { name: 'x' })).rejects.toThrow(
      'Collection not found: missing-id',
    );
  });

  it('trims the name', async () => {
    const created = await createCollection();

    const updated = await updateCollection(created.id, {
      name: '  Moodboard ',
    });

    expect(updated.name).toBe('Moodboard');
  });

  it.each([
    ['an empty name', { name: '   ' }],
    ['a name over 100 characters', { name: 'a'.repeat(101) }],
    ['an unknown color', { color: 'teal' }],
    ['an unknown field', { parentId: null }],
  ])('rejects %s and stores nothing', async (_, input) => {
    const created = await createCollection({ name: 'Keep me' });

    await expect(
      updateCollection(created.id, input as UpdateCollectionInput),
    ).rejects.toThrow();
    expect(await fetchCollection(created.id)).toEqual(created);
  });

  it('ignores keys set to undefined', async () => {
    const created = await createCollection({ name: 'Keep me' });

    const updated = await updateCollection(created.id, {
      name: undefined,
      color: 'red',
    });

    expect(updated.name).toBe('Keep me');
    expect(updated.updatedAt).toBe(created.updatedAt);
  });

  it('saves a color and reads it back', async () => {
    const created = await createCollection();

    await updateCollection(created.id, { color: 'blue' });

    expect((await fetchCollection(created.id))?.color).toBe('blue');
    expect((await fetchAllCollections())[0].color).toBe('blue');
  });

  it('clears the color with null', async () => {
    const created = await createCollection();
    await updateCollection(created.id, { color: 'red' });

    const updated = await updateCollection(created.id, { color: null });

    expect(updated.color).toBeNull();
  });

  it('keeps updatedAt when only the color changes', async () => {
    const created = await createCollection();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await updateCollection(created.id, { color: 'green' });

    expect(updated.updatedAt).toBe(created.updatedAt);
  });

  it('bumps updatedAt when the name changes with the color', async () => {
    const created = await createCollection();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updated = await updateCollection(created.id, {
      name: 'Renamed',
      color: 'green',
    });

    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });
});

describe('color on old records', () => {
  it('reads a record saved without a color as null', async () => {
    const database = await openDatabase();
    const transaction = database.transaction('collections', 'readwrite');
    transaction.objectStore('collections').put({
      id: 'old',
      name: 'Old',
      parentId: null,
      saveCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await new Promise((resolve) => {
      transaction.oncomplete = resolve;
    });

    expect((await fetchCollection('old'))?.color).toBeNull();
    expect((await fetchAllCollections())[0].color).toBeNull();
    expect((await updateCollection('old', { name: 'New' })).color).toBeNull();
  });
});

describe('deleteCollection', () => {
  it('removes the collection', async () => {
    const created = await createCollection({ name: 'Sites' });

    const deleted = await deleteCollection(created.id);

    expect(deleted.id).toBe(created.id);
    expect(await fetchCollection(created.id)).toBeNull();
    expect(await fetchAllCollections()).toEqual([]);
  });

  it('throws when the collection does not exist', async () => {
    await expect(deleteCollection('missing-id')).rejects.toThrow(
      'Collection not found: missing-id',
    );
  });

  it('sends its sources to the trash and detaches them', async () => {
    const created = await createCollection({ name: 'Sites' });
    await seedSource(created.id, 'source-1');
    await seedSource(created.id, 'source-2');

    await deleteCollection(created.id);

    for (const id of ['source-1', 'source-2']) {
      const source = await readSource(id);

      expect(source.deletedAt).not.toBeNull();
      expect(source.collectionIds).toEqual([]);
    }
  });

  it('leaves sources of other collections alone', async () => {
    const deletedCollection = await createCollection({ name: 'Sites' });
    const keptCollection = await createCollection({ name: 'Typography' });
    await seedSource(deletedCollection.id, 'source-1');
    await seedSource(keptCollection.id, 'source-2');
    await seedSource(null, 'source-3');

    await deleteCollection(deletedCollection.id);

    const kept = await readSource('source-2');
    const loose = await readSource('source-3');

    expect(kept.deletedAt).toBeNull();
    expect(kept.collectionIds).toEqual([keptCollection.id]);
    expect(loose.deletedAt).toBeNull();
  });

  it('keeps a source that is also in another collection', async () => {
    const deletedCollection = await createCollection({ name: 'Sites' });
    const keptCollection = await createCollection({ name: 'Typography' });
    await seedSource([deletedCollection.id, keptCollection.id], 'shared');

    await deleteCollection(deletedCollection.id);

    const shared = await readSource('shared');

    expect(shared.deletedAt).toBeNull();
    expect(shared.collectionIds).toEqual([keptCollection.id]);
  });

  it('deletes nested collections with it and leaves others alone', async () => {
    const parent = await createCollection({ name: 'Parent' });
    const child = await createCollection({ parentId: parent.id });
    const grandchild = await createCollection({ parentId: child.id });
    const sibling = await createCollection({ name: 'Sibling' });

    const deleted = await deleteCollection(parent.id);

    expect(deleted.id).toBe(parent.id);
    expect(await fetchCollection(child.id)).toBeNull();
    expect(await fetchCollection(grandchild.id)).toBeNull();
    expect((await fetchAllCollections()).map((c) => c.id)).toEqual([
      sibling.id,
    ]);
  });

  it('sends the sources of nested collections to the trash', async () => {
    const parent = await createCollection({ name: 'Parent' });
    const child = await createCollection({ parentId: parent.id });
    await seedSource(child.id, 'nested-source');

    await deleteCollection(parent.id);

    const source = await readSource('nested-source');

    expect(source.deletedAt).not.toBeNull();
    expect(source.collectionIds).toEqual([]);
  });
});

describe('pickPreviewSources', () => {
  const collection = (id: string, parentId: string | null = null) => ({
    id,
    name: id,
    parentId,
    color: null,
    saveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const source = (id: string, collectionIds: string[], createdAt: string) =>
    ({ id, collectionIds, createdAt }) as Source;

  it('returns the newest sources first, up to three', () => {
    const sources = [
      source('a', ['c1'], '2026-01-01T00:00:00.000Z'),
      source('b', ['c1'], '2026-01-04T00:00:00.000Z'),
      source('c', ['c1'], '2026-01-02T00:00:00.000Z'),
      source('d', ['c1'], '2026-01-03T00:00:00.000Z'),
    ];

    const ids = pickPreviewSources([collection('c1')], sources, 'c1').map(
      ({ id }) => id,
    );

    expect(ids).toEqual(['b', 'd', 'c']);
  });

  it('includes sources from nested collections and skips other ones', () => {
    const collections = [
      collection('c1'),
      collection('child', 'c1'),
      collection('c2'),
    ];
    const sources = [
      source('nested', ['child'], '2026-01-02T00:00:00.000Z'),
      source('other', ['c2'], '2026-01-03T00:00:00.000Z'),
      source('own', ['c1'], '2026-01-01T00:00:00.000Z'),
    ];

    const ids = pickPreviewSources(collections, sources, 'c1').map(
      ({ id }) => id,
    );

    expect(ids).toEqual(['nested', 'own']);
  });

  it('returns an empty list for a collection without sources', () => {
    expect(pickPreviewSources([collection('c1')], [], 'c1')).toEqual([]);
  });
});
