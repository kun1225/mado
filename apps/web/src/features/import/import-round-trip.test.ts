import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

let importLibrary: typeof import('./import-actions').importLibrary;
let buildExportLayout: typeof import('../export/export-layout').buildExportLayout;
let openDatabase: typeof import('../storage/database').openDatabase;

// OPFS does not exist in the test environment, so files live in this map.
const storedFiles = new Map<string, File>();
vi.mock('#/features/sources/source-media', () => ({
  writeMediaFile: vi.fn((key: string, file: File) => {
    storedFiles.set(key, file);
    return Promise.resolve();
  }),
  deleteMediaFile: vi.fn((key: string) => {
    storedFiles.delete(key);
    return Promise.resolve();
  }),
}));

const COLLECTIONS: Collection[] = [
  buildCollection({ id: 'c1', name: 'Moodboard' }),
  buildCollection({ id: 'c2', name: 'Café ☕', parentId: 'c1' }),
];

const SOURCES: Source[] = [
  buildSource({
    id: 'brief',
    name: 'Brand brief',
    note: 'from the kickoff',
    collectionIds: ['c1', 'c2'],
    kind: 'text',
    text: {
      body: '# Brand brief\n\n- **Warm**, slow\n- 咖啡 and 😀\n',
      format: 'markdown',
      fileName: 'brief.markdown',
    },
    storageKey: 'key-brief',
    fileName: 'cover.webp',
    mimeType: 'image/webp',
    sizeBytes: 'cover bytes'.length,
    width: 400,
    height: 300,
  }),
  buildSource({
    id: 'call',
    name: 'Call notes 😀',
    kind: 'text',
    text: {
      body: 'she liked\nthe second one',
      format: 'plain',
      fileName: 'call.txt',
    },
  }),
  buildSource({
    id: 'hero',
    name: 'hero',
    collectionIds: ['c2'],
    kind: 'image',
    storageKey: 'key-hero',
    fileName: 'hero.webp',
    mimeType: 'image/webp',
    sizeBytes: 'hero bytes'.length,
    width: 800,
    height: 600,
  }),
];

const FILE_BYTES: Record<string, string> = {
  'key-brief': 'cover bytes',
  'key-hero': 'hero bytes',
  'key-regular': 'regular bytes',
  'key-bold': 'bold bytes',
};

const FONT_SOURCE = buildSource({
  id: 'type',
  name: 'Brand type',
  collectionIds: ['c1'],
  kind: 'font',
  sizeBytes: 'regular bytes'.length + 'bold bytes'.length,
  font: {
    family: 'Inter',
    sample: 'Warm and slow',
    coverFace: 'key-bold',
    faces: [
      {
        storageKey: 'key-regular',
        fileName: 'Inter-Regular.woff2',
        mimeType: 'font/woff2',
        sizeBytes: 'regular bytes'.length,
        weight: 400,
        style: 'normal',
      },
      {
        storageKey: 'key-bold',
        fileName: 'Inter-Bold.woff2',
        mimeType: 'font/woff2',
        sizeBytes: 'bold bytes'.length,
        weight: 700,
        style: 'normal',
      },
    ],
  },
});

function buildCollection(
  overrides: Partial<Collection> & { id: string },
): Collection {
  return {
    name: 'folder',
    parentId: null,
    color: null,
    saveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function buildSource(overrides: Partial<Source> & { id: string }): Source {
  return {
    name: 'source',
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind: 'image',
    fileName: '',
    mimeType: '',
    sizeBytes: 0,
    width: null,
    height: null,
    durationSeconds: null,
    storageKey: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

/** What the user gets after unzipping the export and picking the folder. */
function exportAsPickedFiles(
  edit: (path: string, text: string) => string = (_path, text) => text,
  sources: Source[] = SOURCES,
): File[] {
  const layout = buildExportLayout(COLLECTIONS, sources, new Date(2026, 9, 27));
  const files = layout.files.map((file) => {
    const path = `${layout.rootName}/${file.path}`;
    const content =
      'text' in file ? edit(file.path, file.text) : FILE_BYTES[file.storageKey];
    return pickedFile(path, content);
  });

  return [
    ...files,
    pickedFile(
      `${layout.rootName}/library.json`,
      JSON.stringify(layout.manifest),
    ),
  ];
}

function pickedFile(path: string, content: string): File {
  // Like Windows, give `.md` no type, so import can't lean on it.
  const file = new File([content], path.split('/').at(-1) ?? path);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

async function readSources(): Promise<Source[]> {
  const database = await openDatabase();
  const request = database
    .transaction('sources')
    .objectStore('sources')
    .getAll();
  const sources = await new Promise<Source[]>((resolve) => {
    request.onsuccess = () => resolve(request.result as Source[]);
  });
  return sources.sort((first, second) => first.id.localeCompare(second.id));
}

async function readCollections(): Promise<Collection[]> {
  const database = await openDatabase();
  const request = database
    .transaction('collections')
    .objectStore('collections')
    .getAll();
  return new Promise<Collection[]>((resolve) => {
    request.onsuccess = () => resolve(request.result as Collection[]);
  });
}

async function seedDeletedCollection(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction('collections', 'readwrite');
  transaction
    .objectStore('collections')
    .put(buildCollection({ id, deletedAt: '2026-02-01T00:00:00.000Z' }));
  await new Promise((resolve) => {
    transaction.oncomplete = resolve;
  });
}

function withoutStorageKey({ storageKey: _key, ...source }: Source) {
  return source;
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();
  storedFiles.clear();

  ({ importLibrary } = await import('./import-actions'));
  ({ buildExportLayout } = await import('../export/export-layout'));
  ({ openDatabase } = await import('../storage/database'));
});

describe('export, then import into an empty library', () => {
  it('brings back every source, its text and its thumbnail', async () => {
    const result = await importLibrary(exportAsPickedFiles(), () => {});

    expect(result).toMatchObject({
      sourceCount: 3,
      collectionCount: 2,
      skippedCount: 0,
      failedCount: 0,
      manifestUnreadable: false,
    });
    const imported = await readSources();
    const expected = [...SOURCES].sort((first, second) =>
      first.id.localeCompare(second.id),
    );
    expect(imported.map(withoutStorageKey)).toEqual(
      expected.map(withoutStorageKey),
    );

    const brief = imported.find(({ id }) => id === 'brief');
    const call = imported.find(({ id }) => id === 'call');
    expect(call?.storageKey).toBeNull();
    expect(await storedFiles.get(brief?.storageKey ?? '')?.text()).toBe(
      'cover bytes',
    );
  });

  it('adds nothing when the same export is imported twice', async () => {
    await importLibrary(exportAsPickedFiles(), () => {});

    const second = await importLibrary(exportAsPickedFiles(), () => {});

    expect(second).toMatchObject({ sourceCount: 0, existingCount: 3 });
    expect(await readSources()).toHaveLength(3);
  });

  it('brings back a collection that was deleted after the export', async () => {
    await seedDeletedCollection('c1');

    await importLibrary(exportAsPickedFiles(), () => {});

    const restored = (await readCollections()).find(({ id }) => id === 'c1');
    expect(restored?.deletedAt).toBeNull();
    const brief = (await readSources()).find(({ id }) => id === 'brief');
    expect(brief?.collectionIds).toEqual(['c1', 'c2']);
  });

  it('saves a text the user edited in the folder before importing', async () => {
    const files = exportAsPickedFiles((path, text) =>
      path.endsWith('.txt') ? 'edited by hand' : text,
    );

    await importLibrary(files, () => {});

    const call = (await readSources()).find(({ id }) => id === 'call');
    expect(call?.text).toEqual({
      body: 'edited by hand',
      format: 'plain',
      fileName: 'call.txt',
    });
  });

  it('counts a text file emptied by hand as failed and keeps the rest', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const files = exportAsPickedFiles((path, text) =>
      path.endsWith('.txt') ? '  ' : text,
    );

    const result = await importLibrary(files, () => {});

    expect(result).toMatchObject({ sourceCount: 2, failedCount: 1 });
  });
});

describe('export, then import a font', () => {
  it('brings back every style, the sentence and the cover style', async () => {
    const result = await importLibrary(
      exportAsPickedFiles(undefined, [FONT_SOURCE]),
      () => {},
    );

    expect(result).toMatchObject({ sourceCount: 1, skippedCount: 0 });
    const [imported] = await readSources();
    const faces = imported.font?.faces ?? [];
    expect(imported).toMatchObject({
      name: 'Brand type',
      kind: 'font',
      storageKey: null,
      sizeBytes: FONT_SOURCE.sizeBytes,
      font: { family: 'Inter', sample: 'Warm and slow' },
    });
    expect(faces.map(({ fileName, weight }) => [fileName, weight])).toEqual([
      ['Inter-Regular.woff2', 400],
      ['Inter-Bold.woff2', 700],
    ]);
    // New keys, so the import can't touch another source's file.
    expect(faces[0].storageKey).not.toBe('key-regular');
    expect(imported.font?.coverFace).toBe(faces[1].storageKey);
    expect(await storedFiles.get(faces[1].storageKey)?.text()).toBe(
      'bold bytes',
    );
  });

  it('leaves out a style whose file is gone', async () => {
    const files = exportAsPickedFiles(undefined, [FONT_SOURCE]).filter(
      (file) => file.name !== 'Inter-Bold.woff2',
    );

    await importLibrary(files, () => {});

    const [imported] = await readSources();
    expect(imported.font?.faces).toHaveLength(1);
    expect(imported.font?.coverFace).toBeNull();
    expect(imported.sizeBytes).toBe('regular bytes'.length);
  });
});

describe('import a plain folder with fonts', () => {
  it('keeps the good styles and counts a broken one as failed', async () => {
    // jsdom has no FontFace. A file whose text is "broken" fails like a bad font.
    vi.stubGlobal(
      'FontFace',
      class {
        constructor(
          readonly family: string,
          private readonly data: ArrayBuffer,
        ) {}
        load() {
          return new TextDecoder().decode(this.data) === 'broken'
            ? Promise.reject(new Error('bad font'))
            : Promise.resolve(this);
        }
      },
    );

    const result = await importLibrary(
      [
        pickedFile('Fonts/Inter-Regular.woff2', 'font'),
        pickedFile('Fonts/Inter-Bold.woff2', 'broken'),
      ],
      () => {},
    );

    const [imported] = await readSources();
    expect(result).toMatchObject({ sourceCount: 1, failedCount: 1 });
    expect(imported.font?.faces).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
