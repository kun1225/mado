import { describe, expect, it } from 'vitest';

import type {
  ExportManifest,
  ExportManifestSource,
} from '#/features/export/export.type';

import type { ImportExistingIds, ImportFile } from './import.type';
import { buildImportPlan, findManifestFile } from './import-plan';

const NOW = new Date('2026-10-20T08:00:00.000Z');
const NO_IDS: ImportExistingIds = {
  collectionIds: new Set(),
  sourceIds: new Set(),
};

function file(path: string, type: string, content = 'data'): ImportFile {
  const name = path.split('/').at(-1) ?? path;
  return { path, file: new File([content], name, { type }) };
}

function counter() {
  let count = 0;
  return () => {
    count += 1;
    return `id-${count}`;
  };
}

function buildManifestSource(
  overrides: Partial<ExportManifestSource> & { id: string },
): ExportManifestSource {
  return {
    name: 'hero',
    kind: 'image',
    url: null,
    note: 'a note',
    tags: ['blue'],
    collectionIds: [],
    fileName: 'hero.png',
    mimeType: 'image/webp',
    sizeBytes: 5,
    width: 800,
    height: 600,
    durationSeconds: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    files: [{ path: 'Unsorted/hero.webp', role: 'media' }],
    ...overrides,
  };
}

function buildManifest(
  overrides: Partial<ExportManifest> = {},
): ExportManifest {
  return {
    format: 'mado-export',
    version: 1,
    exportedAt: '2026-10-19T00:00:00.000Z',
    collections: [],
    sources: [],
    missingFiles: [],
    ...overrides,
  };
}

describe('findManifestFile', () => {
  it('finds library.json at the top of the picked folder', () => {
    const manifest = file('mado-export/library.json', 'application/json');
    const nested = file('mado-export/Moodboard/library.json', '');

    expect(findManifestFile([nested, manifest])).toBe(manifest.file);
    expect(findManifestFile([nested])).toBeNull();
  });
});

describe('buildImportPlan with library.json', () => {
  it('keeps ids, nesting, colors and every field', () => {
    const manifest = buildManifest({
      collections: [
        {
          id: 'c1',
          name: 'Moodboard',
          parentId: null,
          color: 'blue',
          path: 'Moodboard',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
        },
        {
          id: 'c2',
          name: 'Type',
          parentId: 'c1',
          color: null,
          path: 'Moodboard/Type',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      sources: [
        buildManifestSource({
          id: 's1',
          collectionIds: ['c1', 'c2'],
          files: [
            { path: 'Moodboard/hero.webp', role: 'media' },
            { path: 'Moodboard/Type/hero.webp', role: 'media' },
          ],
        }),
      ],
    });
    const hero = file('export/Moodboard/hero.webp', 'image/webp', 'hello');

    const plan = buildImportPlan({
      files: [hero],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections).toEqual([
      {
        id: 'c1',
        name: 'Moodboard',
        parentId: null,
        color: 'blue',
        saveCount: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
      expect.objectContaining({ id: 'c2', parentId: 'c1' }),
    ]);
    expect(plan.items).toEqual([
      {
        kind: 'record',
        file: hero.file,
        source: {
          id: 's1',
          name: 'hero',
          url: null,
          note: 'a note',
          tags: ['blue'],
          collectionIds: ['c1', 'c2'],
          kind: 'image',
          fileName: 'hero.png',
          mimeType: 'image/webp',
          sizeBytes: 5,
          width: 800,
          height: 600,
          durationSeconds: null,
          storageKey: 'id-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          deletedAt: null,
        },
      },
    ]);
    expect(plan.skippedCount).toBe(0);
  });

  it('uses the second copy when the first one is gone', () => {
    const manifest = buildManifest({
      sources: [
        buildManifestSource({
          id: 's1',
          files: [
            { path: 'A/hero.webp', role: 'media' },
            { path: 'B/hero.webp', role: 'media' },
          ],
        }),
      ],
    });
    const second = file('export/B/hero.webp', 'image/webp');

    const plan = buildImportPlan({
      files: [second],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.items).toEqual([
      expect.objectContaining({ kind: 'record', file: second.file }),
    ]);
  });

  it('matches paths written in another Unicode form', () => {
    const manifest = buildManifest({
      sources: [
        buildManifestSource({
          id: 's1',
          files: [{ path: 'Café/hero.webp'.normalize('NFC'), role: 'media' }],
        }),
      ],
    });
    // macOS can hand back names in NFD.
    const hero = file('export/Café/hero.webp'.normalize('NFD'), 'image/webp');

    const plan = buildImportPlan({
      files: [hero],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.items).toHaveLength(1);
  });

  it('skips records whose id is already here, trash included', () => {
    const manifest = buildManifest({
      collections: [
        {
          id: 'c1',
          name: 'Old',
          parentId: null,
          color: null,
          path: 'Old',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      sources: [
        buildManifestSource({ id: 's1', collectionIds: ['c1'] }),
        buildManifestSource({ id: 's2', collectionIds: ['c1'] }),
      ],
    });

    const plan = buildImportPlan({
      files: [file('export/Unsorted/hero.webp', 'image/webp')],
      manifest,
      existing: { collectionIds: new Set(['c1']), sourceIds: new Set(['s1']) },
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections).toEqual([]);
    expect(plan.existingCount).toBe(1);
    expect(plan.items).toEqual([
      expect.objectContaining({
        source: expect.objectContaining({ id: 's2', collectionIds: ['c1'] }),
      }),
    ]);
  });

  it('drops links to collections that are nowhere', () => {
    const manifest = buildManifest({
      collections: [
        {
          id: 'c2',
          name: 'Child',
          parentId: 'gone',
          color: null,
          path: 'Child',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      sources: [
        buildManifestSource({ id: 's1', collectionIds: ['gone', 'c2'] }),
      ],
    });

    const plan = buildImportPlan({
      files: [file('export/Unsorted/hero.webp', 'image/webp')],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections[0]?.parentId).toBeNull();
    expect(plan.items[0]).toEqual(
      expect.objectContaining({
        source: expect.objectContaining({ collectionIds: ['c2'] }),
      }),
    );
  });

  it('skips an image or video whose file is gone', () => {
    const manifest = buildManifest({
      sources: [buildManifestSource({ id: 's1' })],
    });

    const plan = buildImportPlan({
      files: [],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.items).toEqual([]);
    expect(plan.skippedCount).toBe(1);
  });

  it('keeps a website without its thumbnail', () => {
    const manifest = buildManifest({
      sources: [
        buildManifestSource({
          id: 's1',
          kind: 'website',
          url: 'https://dribbble.com',
          files: [
            { path: 'Unsorted/Dribbble.url', role: 'shortcut' },
            { path: 'Unsorted/Dribbble.png', role: 'media' },
          ],
        }),
      ],
    });

    const plan = buildImportPlan({
      files: [file('export/Unsorted/Dribbble.url', '')],
      manifest,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.items).toEqual([
      expect.objectContaining({
        file: null,
        source: expect.objectContaining({
          kind: 'website',
          url: 'https://dribbble.com',
          storageKey: null,
          fileName: '',
          mimeType: '',
          sizeBytes: 0,
          width: null,
          height: null,
        }),
      }),
    ]);
  });
});

describe('buildImportPlan with a plain folder', () => {
  it('turns the picked folder and its subfolders into nested collections', () => {
    const plan = buildImportPlan({
      files: [
        file('Trip/beach.jpg', 'image/jpeg'),
        file('Trip/Day 1/Night/stars.mp4', 'video/mp4'),
      ],
      manifest: null,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections).toEqual([
      {
        id: 'id-1',
        name: 'Trip',
        parentId: null,
        color: null,
        saveCount: 0,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
      expect.objectContaining({ id: 'id-2', name: 'Day 1', parentId: 'id-1' }),
      expect.objectContaining({ id: 'id-3', name: 'Night', parentId: 'id-2' }),
    ]);
    expect(plan.items).toEqual([
      {
        kind: 'file',
        file: expect.objectContaining({ name: 'beach.jpg' }),
        collectionId: 'id-1',
      },
      {
        kind: 'file',
        file: expect.objectContaining({ name: 'stars.mp4' }),
        collectionId: 'id-3',
      },
    ]);
  });

  it('skips other files, and stays quiet about hidden ones', () => {
    const plan = buildImportPlan({
      files: [
        file('Trip/notes.txt', 'text/plain'),
        file('Trip/empty.png', 'image/png', ''),
        file('Trip/.DS_Store', ''),
        file('Trip/Docs/readme.pdf', 'application/pdf'),
      ],
      manifest: null,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections).toEqual([]);
    expect(plan.items).toEqual([]);
    expect(plan.skippedCount).toBe(3);
  });

  it('cuts long folder names to the collection name limit', () => {
    const longName = 'a'.repeat(150);

    const plan = buildImportPlan({
      files: [file(`${longName}/beach.jpg`, 'image/jpeg')],
      manifest: null,
      existing: NO_IDS,
      newId: counter(),
      now: NOW,
    });

    expect(plan.collections[0]?.name).toHaveLength(100);
  });
});
