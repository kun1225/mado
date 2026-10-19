import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from '#/features/sources/source-types';

import type { ExportProgress, ExportTarget } from './export.type';

let exportLibrary: typeof import('./export-actions').exportLibrary;
let openDatabase: typeof import('../storage/database').openDatabase;
let readMediaFile: typeof import('../sources/source-media').readMediaFile;

const EXPORTED_AT = new Date(2026, 9, 19, 12, 0, 0);
const ROOT = 'mado-export-2026-10-19';

// OPFS does not exist in the test environment.
vi.mock('#/features/sources/source-media', () => ({
  readMediaFile: vi.fn(),
}));

function buildSource(overrides: Partial<Source> & { id: string }): Source {
  return {
    name: 'hero',
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind: 'image',
    fileName: 'hero.png',
    mimeType: 'image/png',
    sizeBytes: 5,
    width: 800,
    height: 600,
    durationSeconds: null,
    storageKey: `key-${overrides.id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

async function seed(
  collections: { id: string; name: string; parentId: string | null }[],
  sources: Source[],
) {
  const database = await openDatabase();
  const transaction = database.transaction(
    ['collections', 'sources'],
    'readwrite',
  );

  for (const collection of collections) {
    transaction.objectStore('collections').put({
      ...collection,
      color: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  }
  for (const source of sources) transaction.objectStore('sources').put(source);

  await new Promise((resolve) => {
    transaction.oncomplete = resolve;
  });
}

function createMemoryTarget() {
  const chunks: Uint8Array[] = [];
  const finish = vi.fn(() => Promise.resolve());
  const abort = vi.fn();
  const target: ExportTarget = {
    writable: new WritableStream<Uint8Array>({
      write: (chunk) => {
        chunks.push(chunk);
      },
      abort,
    }),
    finish,
  };

  return { target, finish, abort, read: () => readZip(concat(chunks)) };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0));
  chunks.reduce((offset, chunk) => {
    bytes.set(chunk, offset);
    return offset + chunk.length;
  }, 0);
  return bytes;
}

/** Reads the central directory, so the test checks the real zip and not our input. */
function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let end = bytes.length - 22;
  while (view.getUint32(end, true) !== 0x06054b50) end -= 1;

  const entries = new Map<string, string>();
  let offset = view.getUint32(end + 16, true);
  for (let index = 0; index < view.getUint16(end + 10, true); index += 1) {
    const size = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(
      bytes.subarray(offset + 46, offset + 46 + nameLength),
    );
    const dataStart =
      local +
      30 +
      view.getUint16(local + 26, true) +
      view.getUint16(local + 28, true);

    entries.set(
      name,
      decoder.decode(bytes.subarray(dataStart, dataStart + size)),
    );
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();

  ({ exportLibrary } = await import('./export-actions'));
  ({ openDatabase } = await import('../storage/database'));
  ({ readMediaFile } = await import('../sources/source-media'));
  vi.mocked(readMediaFile).mockImplementation((key) =>
    Promise.resolve(new File([`data:${key}`], 'stored')),
  );
});

describe('exportLibrary', () => {
  it('writes folders, files and library.json into one zip', async () => {
    await seed(
      [
        { id: 'c1', name: 'Moodboard', parentId: null },
        { id: 'c2', name: 'Empty', parentId: 'c1' },
      ],
      [
        buildSource({ id: 's1', collectionIds: ['c1'] }),
        buildSource({
          id: 's2',
          name: 'Site',
          kind: 'website',
          url: 'https://example.com/',
          storageKey: null,
        }),
        buildSource({ id: 's3', deletedAt: '2026-03-01T00:00:00.000Z' }),
      ],
    );
    const { target, finish, read } = createMemoryTarget();

    const result = await exportLibrary(target, EXPORTED_AT, vi.fn());
    const zip = read();

    expect(result).toEqual({ sourceCount: 2, missingCount: 0 });
    expect([...zip.keys()]).toEqual([
      `${ROOT}/Moodboard/`,
      `${ROOT}/Moodboard/Empty/`,
      `${ROOT}/Moodboard/hero.png`,
      `${ROOT}/Unsorted/Site.url`,
      `${ROOT}/library.json`,
    ]);
    expect(zip.get(`${ROOT}/Moodboard/hero.png`)).toBe('data:key-s1');
    const manifest = JSON.parse(zip.get(`${ROOT}/library.json`) ?? '');
    expect(manifest.sources.map((source: Source) => source.id)).toEqual([
      's1',
      's2',
    ]);
    expect(finish).toHaveBeenCalledOnce();
  });

  it('skips a file that is gone and lists it', async () => {
    await seed(
      [],
      [buildSource({ id: 's1' }), buildSource({ id: 's2', name: 'gone' })],
    );
    vi.mocked(readMediaFile).mockImplementation((key) =>
      key === 'key-s2'
        ? Promise.reject(new DOMException('Gone', 'NotFoundError'))
        : Promise.resolve(new File(['ok'], 'stored')),
    );
    const { target, read } = createMemoryTarget();

    const result = await exportLibrary(target, EXPORTED_AT, vi.fn());
    const zip = read();

    expect(result).toEqual({ sourceCount: 2, missingCount: 1 });
    expect(zip.has(`${ROOT}/Unsorted/gone.png`)).toBe(false);
    expect(JSON.parse(zip.get(`${ROOT}/library.json`) ?? '')).toMatchObject({
      missingFiles: ['Unsorted/gone.png'],
    });
  });

  it('reports progress for every file', async () => {
    await seed([], [buildSource({ id: 's1' }), buildSource({ id: 's2' })]);
    const progress: ExportProgress[] = [];
    const { target } = createMemoryTarget();

    await exportLibrary(target, EXPORTED_AT, (value) => progress.push(value));

    expect(progress).toEqual([
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ]);
  });

  it('aborts the file and passes the error on', async () => {
    await seed([], [buildSource({ id: 's1' })]);
    const error = new DOMException('Full', 'QuotaExceededError');
    vi.mocked(readMediaFile).mockRejectedValue(error);
    const { target, finish, abort } = createMemoryTarget();

    await expect(exportLibrary(target, EXPORTED_AT, vi.fn())).rejects.toBe(
      error,
    );
    expect(abort).toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});
