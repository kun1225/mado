import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  indexedDB = new IDBFactory();
});

/** Builds a v2 database holding one source in the old single-collection shape. */
function seedV2Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mado', 2);

    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('collections', { keyPath: 'id' });
      const sources = database.createObjectStore('sources', { keyPath: 'id' });
      sources.createIndex('collectionId', 'collectionId');
      sources.put({
        id: 'a',
        collectionId: 'c1',
        fileName: 'poster.final.webp',
      });
      sources.put({ id: 'b', collectionId: null, fileName: 'clip' });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function seedNewerDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mado', 4);

    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore('collections', { keyPath: 'id' });
      database.createObjectStore('sources', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe('database v3 migration', () => {
  it('moves collectionId into collectionIds and fills the new fields', async () => {
    await seedV2Database();

    const { openDatabase, toPromise } = await import('./database');
    const database = await openDatabase();
    const store = database
      .transaction('sources', 'readonly')
      .objectStore('sources');

    const a = await toPromise<Record<string, unknown>>(store.get('a'));
    const b = await toPromise<Record<string, unknown>>(store.get('b'));

    expect(a).toMatchObject({
      collectionIds: ['c1'],
      name: 'poster.final',
      url: null,
      note: null,
      tags: [],
    });
    expect(a).not.toHaveProperty('collectionId');
    expect(b).toMatchObject({ collectionIds: [], name: 'clip' });
    expect(
      await toPromise(store.index('collectionIds').getAll('c1')),
    ).toHaveLength(1);
  });

  it('opens a database created by a newer app version', async () => {
    await seedNewerDatabase();

    const { openDatabase } = await import('./database');
    const database = await openDatabase();

    expect(database.version).toBe(4);
    expect(database.objectStoreNames).toContain('collections');
    expect(database.objectStoreNames).toContain('sources');
  });
});
