import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExportManifest } from '#/features/export/export.type';
import type { Source } from '#/features/sources/source-types';

import type { ImportProgress } from './import.type';

let importLibrary: typeof import('./import-actions').importLibrary;
let isQuotaError: typeof import('./import-actions').isQuotaError;
let openDatabase: typeof import('../storage/database').openDatabase;
let writeMediaFile: typeof import('../sources/source-media').writeMediaFile;
let deleteMediaFile: typeof import('../sources/source-media').deleteMediaFile;
let createSource: typeof import('../sources/source-actions').createSource;

// OPFS does not exist in the test environment, and `createSource` needs a real browser to read sizes.
vi.mock('#/features/sources/source-media', () => ({
  writeMediaFile: vi.fn(() => Promise.resolve()),
  deleteMediaFile: vi.fn(() => Promise.resolve()),
}));
vi.mock('#/features/sources/source-actions', () => ({
  createSource: vi.fn(),
}));

function pickedFile(path: string, type: string, content = 'data'): File {
  const file = new File([content], path.split('/').at(-1) ?? path, { type });
  // Set by the browser for `<input webkitdirectory>`.
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

function manifestFile(manifest: ExportManifest | string): File {
  const text =
    typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
  return pickedFile('export/library.json', 'application/json', text);
}

const MANIFEST: ExportManifest = {
  format: 'mado-export',
  version: 1,
  exportedAt: '2026-10-19T00:00:00.000Z',
  collections: [
    {
      id: 'c1',
      name: 'Moodboard',
      parentId: null,
      color: 'pink',
      path: 'Moodboard',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  sources: [
    {
      id: 's1',
      name: 'hero',
      kind: 'image',
      url: null,
      note: null,
      tags: [],
      collectionIds: ['c1'],
      fileName: 'hero.png',
      mimeType: 'image/webp',
      sizeBytes: 5,
      width: 10,
      height: 10,
      durationSeconds: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      files: [{ path: 'Moodboard/hero.webp', role: 'media' }],
    },
  ],
  missingFiles: [],
};

async function readAll<T>(store: 'collections' | 'sources'): Promise<T[]> {
  const database = await openDatabase();
  const request = database.transaction(store).objectStore(store).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result as T[]);
  });
}

async function seedSource(source: Partial<Source> & { id: string }) {
  const database = await openDatabase();
  const transaction = database.transaction('sources', 'readwrite');
  transaction.objectStore('sources').put({ collectionIds: [], ...source });
  await new Promise((resolve) => {
    transaction.oncomplete = resolve;
  });
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();

  ({ importLibrary, isQuotaError } = await import('./import-actions'));
  ({ openDatabase } = await import('../storage/database'));
  ({ writeMediaFile, deleteMediaFile } =
    await import('../sources/source-media'));
  ({ createSource } = await import('../sources/source-actions'));
  vi.mocked(createSource).mockImplementation(({ file, collectionId }) =>
    Promise.resolve({
      id: `new-${file.name}`,
      collectionIds: collectionId ? [collectionId] : [],
    } as Source),
  );
});

describe('importLibrary from an export', () => {
  it('rebuilds collections and sources with their ids', async () => {
    const hero = pickedFile('export/Moodboard/hero.webp', 'image/webp');
    const progress: ImportProgress[] = [];

    const result = await importLibrary([manifestFile(MANIFEST), hero], (p) =>
      progress.push(p),
    );

    expect(result).toEqual({
      sourceCount: 1,
      collectionCount: 1,
      existingCount: 0,
      skippedCount: 0,
      failedCount: 0,
      manifestUnreadable: false,
      newSources: [],
    });
    expect(await readAll('collections')).toEqual([
      expect.objectContaining({ id: 'c1', color: 'pink' }),
    ]);
    const [source] = await readAll<Source>('sources');
    expect(source).toEqual(
      expect.objectContaining({ id: 's1', collectionIds: ['c1'] }),
    );
    expect(writeMediaFile).toHaveBeenCalledWith(source.storageKey, hero);
    expect(progress).toEqual([{ done: 1, total: 1 }]);
  });

  it('leaves sources that are already here untouched', async () => {
    await seedSource({ id: 's1', name: 'mine' });

    const result = await importLibrary(
      [
        manifestFile(MANIFEST),
        pickedFile('export/Moodboard/hero.webp', 'image/webp'),
      ],
      () => {},
    );

    expect(result.sourceCount).toBe(0);
    expect(result.existingCount).toBe(1);
    expect(await readAll('sources')).toEqual([
      expect.objectContaining({ id: 's1', name: 'mine' }),
    ]);
    expect(writeMediaFile).not.toHaveBeenCalled();
  });

  it('never overwrites a source saved by another tab meanwhile', async () => {
    vi.mocked(writeMediaFile).mockImplementationOnce(() =>
      seedSource({ id: 's1', name: 'mine' }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await importLibrary(
      [
        manifestFile(MANIFEST),
        pickedFile('export/Moodboard/hero.webp', 'image/webp'),
      ],
      () => {},
    );

    expect(result.failedCount).toBe(1);
    expect(await readAll('sources')).toEqual([
      expect.objectContaining({ id: 's1', name: 'mine' }),
    ]);
    const [[storageKey]] = vi.mocked(writeMediaFile).mock.calls;
    expect(deleteMediaFile).toHaveBeenCalledWith(storageKey);
  });
});

describe('importLibrary from a plain folder', () => {
  it('saves each file with createSource into its folder', async () => {
    const result = await importLibrary(
      [
        pickedFile('Trip/beach.jpg', 'image/jpeg'),
        pickedFile('Trip/page.html', 'text/html'),
      ],
      () => {},
    );

    const [trip] = await readAll<{ id: string; name: string }>('collections');
    expect(trip.name).toBe('Trip');
    expect(createSource).toHaveBeenCalledWith({
      file: expect.objectContaining({ name: 'beach.jpg' }),
      collectionId: trip.id,
    });
    expect(result).toEqual(
      expect.objectContaining({
        sourceCount: 1,
        collectionCount: 1,
        skippedCount: 1,
        newSources: [expect.objectContaining({ id: 'new-beach.jpg' })],
      }),
    );
  });

  it('keeps going when one file fails', async () => {
    vi.mocked(createSource).mockRejectedValueOnce(new Error('Broken'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await importLibrary(
      [
        pickedFile('Trip/a.jpg', 'image/jpeg'),
        pickedFile('Trip/b.jpg', 'image/jpeg'),
      ],
      () => {},
    );

    expect(result.sourceCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('stops when the disk is full', async () => {
    vi.mocked(createSource).mockRejectedValueOnce(
      new Error('Failed to store "a.jpg" on this device.', {
        cause: new DOMException('Full', 'QuotaExceededError'),
      }),
    );

    await expect(
      importLibrary(
        [
          pickedFile('Trip/a.jpg', 'image/jpeg'),
          pickedFile('Trip/b.jpg', 'image/jpeg'),
        ],
        () => {},
      ),
    ).rejects.toThrow('Failed to store');
    expect(createSource).toHaveBeenCalledTimes(1);
  });

  it('falls back to the folder rule when library.json is broken', async () => {
    const result = await importLibrary(
      [manifestFile('{ not json'), pickedFile('export/a.jpg', 'image/jpeg')],
      () => {},
    );

    expect(result.manifestUnreadable).toBe(true);
    expect(result.sourceCount).toBe(1);
  });
});

describe('isQuotaError', () => {
  it('finds a full disk inside wrapped errors', () => {
    const full = new DOMException('Full', 'QuotaExceededError');

    expect(isQuotaError(full)).toBe(true);
    expect(isQuotaError(new Error('Outer', { cause: full }))).toBe(true);
    expect(isQuotaError(new Error('Other'))).toBe(false);
  });
});
