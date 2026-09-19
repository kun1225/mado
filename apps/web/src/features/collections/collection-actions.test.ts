import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from '../sources/source-types';

let createCollection: typeof import('./collection-actions').createCollection;
let deleteCollection: typeof import('./collection-actions').deleteCollection;
let fetchAllCollections: typeof import('./collection-actions').fetchAllCollections;
let fetchCollection: typeof import('./collection-actions').fetchCollection;
let updateCollection: typeof import('./collection-actions').updateCollection;
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
  } = await import('./collection-actions'));

  ({ openDatabase } = await import('../storage/database'));
});

async function seedSource(collectionId: string | null, id: string) {
  const database = await openDatabase();
  const transaction = database.transaction('sources', 'readwrite');

  transaction.objectStore('sources').put({
    id,
    collectionId,
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
      expect(source.collectionId).toBeNull();
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
    expect(kept.collectionId).toBe(keptCollection.id);
    expect(loose.deletedAt).toBeNull();
  });
});
