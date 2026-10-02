import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from './source-types';

let countSourcesByCollection: typeof import('./source-actions').countSourcesByCollection;
let deleteSource: typeof import('./source-actions').deleteSource;
let deleteSources: typeof import('./source-actions').deleteSources;
let fetchAllSources: typeof import('./source-actions').fetchAllSources;
let fetchDeletedSources: typeof import('./source-actions').fetchDeletedSources;
let fetchSourcesByCollection: typeof import('./source-actions').fetchSourcesByCollection;
let hardDeleteSource: typeof import('./source-actions').hardDeleteSource;
let hardDeleteSources: typeof import('./source-actions').hardDeleteSources;
let restoreSources: typeof import('./source-actions').restoreSources;
let updateSource: typeof import('./source-actions').updateSource;
let updateSourceSchema: typeof import('./source-types').updateSourceSchema;
let deleteMediaFile: typeof import('./source-storage').deleteMediaFile;
let openDatabase: typeof import('../storage/database').openDatabase;
let newSourceSchema: typeof import('./source-types').newSourceSchema;
let sourceKindSchema: typeof import('./source-types').sourceKindSchema;

const COLLECTION_ID = '11111111-1111-4111-8111-111111111111';

// OPFS does not exist in the test environment, so the media side is stubbed and
// asserted through the spy.
vi.mock('./source-storage', () => ({
  isMediaStorageSupported: false,
  deleteMediaFile: vi.fn(() => Promise.resolve()),
  readMediaFile: vi.fn(),
  writeMediaFile: vi.fn(() => Promise.resolve()),
}));

function buildSource(overrides: Partial<Source> & { id: string }): Source {
  return {
    name: 'shot',
    url: null,
    note: null,
    tags: [],
    collectionIds: [COLLECTION_ID],
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
    deleteSources,
    fetchAllSources,
    fetchDeletedSources,
    fetchSourcesByCollection,
    hardDeleteSource,
    hardDeleteSources,
    restoreSources,
    updateSource,
  } = await import('./source-actions'));
  ({ deleteMediaFile } = await import('./source-storage'));
  ({ openDatabase } = await import('../storage/database'));
  ({ newSourceSchema, sourceKindSchema, updateSourceSchema } =
    await import('./source-types'));
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
        collectionIds: ['22222222-2222-4222-8222-222222222222'],
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
        collectionIds: [],
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const sources = await fetchAllSources();

    expect(sources.map((source) => source.id)).toEqual(['b', 'a']);
  });
});

describe('fetchDeletedSources', () => {
  it('returns only soft-deleted sources, most recently deleted first', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({ id: 'b', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({
        id: 'c',
        collectionIds: [],
        deletedAt: '2026-01-05T00:00:00.000Z',
      }),
    ]);

    const sources = await fetchDeletedSources();

    expect(sources.map((source) => source.id)).toEqual(['c', 'b']);
  });

  it('returns an empty list when nothing is deleted', async () => {
    await seedSources([buildSource({ id: 'a' })]);

    await expect(fetchDeletedSources()).resolves.toEqual([]);
  });
});

describe('countSourcesByCollection', () => {
  it('counts live sources per collection and skips library-level ones', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({ id: 'b' }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'd', collectionIds: [] }),
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

describe('hardDeleteSource', () => {
  it('removes the record and its media file for good', async () => {
    await seedSources([
      buildSource({ id: 'a', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'b', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const hardDeleted = await hardDeleteSource('a');

    expect(hardDeleted.id).toBe('a');
    expect(deleteMediaFile).toHaveBeenCalledWith('a');
    await expect(fetchDeletedSources()).resolves.toHaveLength(1);
  });

  it('throws when the source does not exist', async () => {
    await expect(hardDeleteSource('missing-id')).rejects.toThrow(
      'Source not found: missing-id',
    );
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });
});

describe('deleteSources', () => {
  it('soft deletes every source it is given', async () => {
    await seedSources([
      buildSource({ id: 'a' }),
      buildSource({ id: 'b' }),
      buildSource({ id: 'c' }),
    ]);

    const deleted = await deleteSources(['a', 'b']);

    expect(deleted.map((source) => source.id)).toEqual(['a', 'b']);
    expect(deleted.every((source) => source.deletedAt !== null)).toBe(true);
    await expect(fetchSourcesByCollection(COLLECTION_ID)).resolves.toHaveLength(
      1,
    );
  });

  it('skips ids that no longer exist', async () => {
    await seedSources([buildSource({ id: 'a' })]);

    const deleted = await deleteSources(['a', 'missing-id']);

    expect(deleted.map((source) => source.id)).toEqual(['a']);
  });
});

describe('hardDeleteSources', () => {
  it('removes every record and its media file', async () => {
    await seedSources([
      buildSource({ id: 'a', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'b', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const hardDeleted = await hardDeleteSources(['a', 'b']);

    expect(hardDeleted.map((source) => source.id)).toEqual(['a', 'b']);
    expect(deleteMediaFile).toHaveBeenCalledWith('a');
    expect(deleteMediaFile).toHaveBeenCalledWith('b');
    await expect(fetchDeletedSources()).resolves.toHaveLength(1);
  });

  it('skips ids that no longer exist', async () => {
    const hardDeleted = await hardDeleteSources(['missing-id']);

    expect(hardDeleted).toEqual([]);
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });
});

describe('restoreSources', () => {
  it('takes every source it is given out of the trash', async () => {
    await seedSources([
      buildSource({ id: 'a', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'b', deletedAt: '2026-01-04T00:00:00.000Z' }),
      buildSource({ id: 'c', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const restored = await restoreSources(['a', 'b']);

    expect(restored.map((source) => source.id)).toEqual(['a', 'b']);
    expect(restored.every((source) => source.deletedAt === null)).toBe(true);
    await expect(fetchDeletedSources()).resolves.toHaveLength(1);
    await expect(fetchAllSources()).resolves.toHaveLength(2);
  });

  it('keeps the media file, so the restored source still points at its bytes', async () => {
    await seedSources([
      buildSource({ id: 'a', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const [restored] = await restoreSources(['a']);

    expect(restored.storageKey).toBe('a');
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });

  it('skips ids that no longer exist', async () => {
    await seedSources([
      buildSource({ id: 'a', deletedAt: '2026-01-04T00:00:00.000Z' }),
    ]);

    const restored = await restoreSources(['a', 'missing-id']);

    expect(restored.map((source) => source.id)).toEqual(['a']);
  });

  it('leaves a source that was never deleted alone', async () => {
    await seedSources([buildSource({ id: 'a' })]);

    const restored = await restoreSources(['a']);

    expect(restored).toEqual([]);
    await expect(fetchAllSources()).resolves.toHaveLength(1);
  });
});

describe('fetchSourcesByCollection with many collections', () => {
  it('finds a source in each collection it belongs to', async () => {
    const other = '22222222-2222-4222-8222-222222222222';
    await seedSources([
      buildSource({ id: 'a', collectionIds: [COLLECTION_ID, other] }),
    ]);

    expect((await fetchSourcesByCollection(COLLECTION_ID)).length).toBe(1);
    expect((await fetchSourcesByCollection(other)).length).toBe(1);

    const counts = await countSourcesByCollection();
    expect(counts.get(COLLECTION_ID)).toBe(1);
    expect(counts.get(other)).toBe(1);
  });
});

describe('updateSourceSchema', () => {
  it('trims the name and rejects an empty one', () => {
    expect(updateSourceSchema.parse({ name: '  Poster ' })).toEqual({
      name: 'Poster',
    });
    expect(() => updateSourceSchema.parse({ name: '   ' })).toThrow();
  });

  it('turns an empty url or note into null and rejects a bad url', () => {
    expect(updateSourceSchema.parse({ url: '', note: ' ' })).toEqual({
      url: null,
      note: null,
    });
    expect(() =>
      updateSourceSchema.parse({ url: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() => updateSourceSchema.parse({ url: 'not a url' })).toThrow();
    expect(updateSourceSchema.parse({ url: 'https://a.com/x' }).url).toBe(
      'https://a.com/x',
    );
  });

  it('normalizes tags and removes duplicates', () => {
    expect(
      updateSourceSchema.parse({ tags: ['#Poster', 'poster', ' ', 'Red '] })
        .tags,
    ).toEqual(['poster', 'red']);
  });
});

describe('updateSource', () => {
  it('changes only the given fields and bumps updatedAt', async () => {
    await seedSources([buildSource({ id: 'a' })]);

    const updated = await updateSource('a', { note: 'hello', tags: ['Red'] });

    expect(updated.note).toBe('hello');
    expect(updated.tags).toEqual(['red']);
    expect(updated.name).toBe('shot');
    expect(updated.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');
    expect((await fetchAllSources())[0]?.note).toBe('hello');
  });

  it('moves a source between collections', async () => {
    const other = '22222222-2222-4222-8222-222222222222';
    await seedSources([buildSource({ id: 'a' })]);

    await updateSource('a', { collectionIds: [other] });

    expect(await fetchSourcesByCollection(COLLECTION_ID)).toEqual([]);
    expect((await fetchSourcesByCollection(other)).length).toBe(1);
  });

  it('throws for a missing source and for invalid input', async () => {
    await expect(updateSource('missing', { name: 'x' })).rejects.toThrow(
      'Source not found: missing',
    );
    await seedSources([buildSource({ id: 'a' })]);
    await expect(updateSource('a', { name: '' })).rejects.toThrow();
  });
});
