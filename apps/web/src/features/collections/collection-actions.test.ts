import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let createCollection: typeof import('./collection-actions').createCollection;
let fetchAllCollections: typeof import('./collection-actions').fetchAllCollections;
let fetchCollection: typeof import('./collection-actions').fetchCollection;
let updateCollection: typeof import('./collection-actions').updateCollection;

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();

  ({
    createCollection,
    fetchAllCollections,
    fetchCollection,
    updateCollection,
  } = await import('./collection-actions'));
});

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
