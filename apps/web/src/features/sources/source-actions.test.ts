import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from './source-types';

let countSourcesByCollection: typeof import('./source-actions').countSourcesByCollection;
let deleteSource: typeof import('./source-actions').deleteSource;
let fetchAllSources: typeof import('./source-actions').fetchAllSources;
let fetchSourcesByCollection: typeof import('./source-actions').fetchSourcesByCollection;
let openDatabase: typeof import('../storage/database').openDatabase;
let newSourceSchema: typeof import('./source-types').newSourceSchema;
let sourceKindSchema: typeof import('./source-types').sourceKindSchema;

const COLLECTION_ID = '11111111-1111-4111-8111-111111111111';

function buildSource(overrides: Partial<Source> & { id: string }): Source {
  return {
    collectionId: COLLECTION_ID,
    kind: 'image',
    fileName: 'shot.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    width: 800,
    height: 600,
    durationSeconds: null,
    storageKey: overrides.id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

async function seedSources(sources: Source[]) {
  const database = await openDatabase();
  const transaction = database.transaction('sources', 'readwrite');
  const store = transaction.objectStore('sources');

  for (const source of sources) store.put(source);

  await new Promise((resolve) => {
    transaction.oncomplete = resolve;
  });
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();

  ({
    countSourcesByCollection,
    deleteSource,
    fetchAllSources,
    fetchSourcesByCollection,
  } = await import('./source-actions'));
  ({ openDatabase } = await import('../storage/database'));
  ({ newSourceSchema, sourceKindSchema } = await import('./source-types'));
});

describe('newSourceSchema', () => {
  it('rejects an empty file', () => {
    const file = new File([], 'empty.png', { type: 'image/png' });

    expect(() =>
      newSourceSchema.parse({ collectionId: COLLECTION_ID, file }),
    ).toThrow('File is empty');
  });

  it('accepts a normal image file', () => {
    const file = new File(['bytes'], 'shot.png', { type: 'image/png' });

    expect(() =>
      newSourceSchema.parse({ collectionId: COLLECTION_ID, file }),
    ).not.toThrow();
  });

  it('accepts a null collectionId for library-level sources', () => {
    const file = new File(['bytes'], 'shot.png', { type: 'image/png' });

    expect(() =>
      newSourceSchema.parse({ collectionId: null, file }),
    ).not.toThrow();
  });
});

describe('sourceKindSchema', () => {
  it.each([
    ['image/png', 'image'],
    ['video/mp4', 'video'],
  ])('maps %s to %s', (mimeType, kind) => {
    expect(sourceKindSchema.parse(mimeType.split('/')[0])).toBe(kind);
  });

  it('rejects other file types', () => {
    expect(() => sourceKindSchema.parse('application')).toThrow(
      'Only images and videos are supported',
    );
  });
});

describe('fetchSourcesByCollection', () => {
  it('returns newest first and hides soft-deleted sources', async () => {
    await seedSources([
      buildSource({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' }),
      buildSource({ id: 'b', createdAt: '2026-01-02T00:00:00.000Z' }),
      buildSource({
        id: 'c',
        createdAt: '2026-01-03T00:00:00.000Z',
        deletedAt: '2026-01-04T00:00:00.000Z',
      }),
    ]);

    const sources = await fetchSourcesByCollection(COLLECTION_ID);

    expect(sources.map((source) => source.id)).toEqual(['b', 'a']);
  });

  it('ignores sources from other collections', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({
        id: 'b',
        collectionId: '22222222-2222-4222-8222-222222222222',
      }),
    ]);

    const sources = await fetchSourcesByCollection(COLLECTION_ID);

    expect(sources.map((source) => source.id)).toEqual(['a']);
  });
});

describe('fetchAllSources', () => {
  it('includes library-level sources and hides soft-deleted ones', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({
        id: 'b',
        collectionId: null,
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const sources = await fetchAllSources();

    expect(sources.map((source) => source.id)).toEqual(['b', 'a']);
  });
});

describe('countSourcesByCollection', () => {
  it('counts live sources per collection and skips library-level ones', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({ id: 'b' }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'd', collectionId: null }),
    ]);

    const counts = await countSourcesByCollection();

    expect(counts.get(COLLECTION_ID)).toBe(2);
    expect(counts.size).toBe(1);
  });
});

describe('deleteSource', () => {
  it('soft deletes the record instead of removing it', async () => {
    await seedSources([buildSource({ id: 'a' })]);

    const deleted = await deleteSource('a');

    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.storageKey).toBe('a');
    await expect(fetchSourcesByCollection(COLLECTION_ID)).resolves.toEqual([]);
  });

  it('throws when the source does not exist', async () => {
    await expect(deleteSource('missing-id')).rejects.toThrow(
      'Source not found: missing-id',
    );
  });
});
