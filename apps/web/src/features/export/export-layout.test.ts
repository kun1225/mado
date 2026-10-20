import { describe, expect, it } from 'vitest';

import type { Collection } from '#/features/collections/collection-types';
import type { Source } from '#/features/sources/source-types';

import { buildExportLayout, toExportName } from './export-layout';
import { exportManifestSchema } from './export-manifest';

const EXPORTED_AT = new Date(2026, 9, 19, 12, 0, 0);

function buildCollection(
  overrides: Partial<Collection> & { id: string },
): Collection {
  return {
    name: 'Moodboard',
    parentId: null,
    color: null,
    saveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildSource(overrides: Partial<Source> & { id: string }): Source {
  return {
    name: 'hero',
    url: null,
    note: null,
    tags: [],
    collectionIds: [],
    kind: 'image',
    fileName: 'hero.webp',
    mimeType: 'image/webp',
    sizeBytes: 1024,
    width: 800,
    height: 600,
    durationSeconds: null,
    storageKey: `key-${overrides.id}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function pathsOf(collections: Collection[], sources: Source[]) {
  return buildExportLayout(collections, sources, EXPORTED_AT).files.map(
    (file) => file.path,
  );
}

describe('toExportName', () => {
  it('uses the local date', () => {
    expect(toExportName(EXPORTED_AT)).toBe('mado-export-2026-10-19');
  });
});

describe('buildExportLayout', () => {
  it('puts sources with no collection in Unsorted', () => {
    expect(pathsOf([], [buildSource({ id: 's1' })])).toEqual([
      'Unsorted/hero.webp',
    ]);
  });

  it('nests folders inside their collection', () => {
    const collections = [
      buildCollection({ id: 'c1', name: 'Moodboard' }),
      buildCollection({ id: 'c2', name: 'Typography', parentId: 'c1' }),
    ];
    const layout = buildExportLayout(
      collections,
      [buildSource({ id: 's1', name: 'serif', collectionIds: ['c2'] })],
      EXPORTED_AT,
    );

    expect(layout.folders).toEqual(['Moodboard', 'Moodboard/Typography']);
    expect(layout.files.map((file) => file.path)).toEqual([
      'Moodboard/Typography/serif.webp',
    ]);
  });

  it('treats a collection with a missing parent as top-level', () => {
    const layout = buildExportLayout(
      [buildCollection({ id: 'c1', name: 'Lost', parentId: 'gone' })],
      [],
      EXPORTED_AT,
    );

    expect(layout.folders).toEqual(['Lost']);
  });

  it('copies a source into every collection it is in', () => {
    const collections = [
      buildCollection({ id: 'c1', name: 'A' }),
      buildCollection({ id: 'c2', name: 'B' }),
    ];

    expect(
      pathsOf(collections, [
        buildSource({ id: 's1', collectionIds: ['c1', 'c2'] }),
      ]),
    ).toEqual(['A/hero.webp', 'B/hero.webp']);
  });

  it('ignores a collection id that no longer exists', () => {
    expect(
      pathsOf([], [buildSource({ id: 's1', collectionIds: ['gone'] })]),
    ).toEqual(['Unsorted/hero.webp']);
  });

  it('numbers repeated names, ignoring case', () => {
    expect(
      pathsOf(
        [],
        [
          buildSource({ id: 's1', name: 'Hero' }),
          buildSource({ id: 's2', name: 'hero' }),
          buildSource({ id: 's3', name: 'HERO' }),
        ],
      ),
    ).toEqual([
      'Unsorted/Hero.webp',
      'Unsorted/hero (2).webp',
      'Unsorted/HERO (3).webp',
    ]);
  });

  it('numbers collections with the same name', () => {
    const layout = buildExportLayout(
      [
        buildCollection({ id: 'c1', name: 'Ideas' }),
        buildCollection({ id: 'c2', name: 'ideas' }),
      ],
      [],
      EXPORTED_AT,
    );

    expect(layout.folders).toEqual(['Ideas', 'ideas (2)']);
  });

  it('keeps the export names for itself', () => {
    const layout = buildExportLayout(
      [
        buildCollection({ id: 'c1', name: 'Unsorted' }),
        buildCollection({ id: 'c2', name: 'library.json' }),
      ],
      [],
      EXPORTED_AT,
    );

    expect(layout.folders).toEqual(['Unsorted (2)', 'library.json (2)']);
  });

  it('makes names safe for Windows and macOS', () => {
    expect(
      pathsOf(
        [buildCollection({ id: 'c1', name: 'a/b: c?' })],
        [
          buildSource({
            id: 's1',
            name: 'what? "now" ',
            collectionIds: ['c1'],
          }),
          buildSource({ id: 's2', name: 'CON', collectionIds: ['c1'] }),
          buildSource({ id: 's6', name: 'nul.txt', collectionIds: ['c1'] }),
          buildSource({ id: 's3', name: '...', collectionIds: ['c1'] }),
          buildSource({
            id: 's4',
            name: 'x'.repeat(150),
            collectionIds: ['c1'],
          }),
          buildSource({ id: 's5', name: '.secret', collectionIds: ['c1'] }),
        ],
      ),
    ).toEqual([
      'a-b- c-/what- -now-.webp',
      'a-b- c-/CON-.webp',
      'a-b- c-/nul.txt-.webp',
      'a-b- c-/Untitled.webp',
      `a-b- c-/${'x'.repeat(60)}.webp`,
      'a-b- c-/secret.webp',
    ]);
  });

  it('never splits an emoji when it cuts a long name', () => {
    expect(
      pathsOf([], [buildSource({ id: 's1', name: '🎨'.repeat(120) })]),
    ).toEqual([`Unsorted/${'🎨'.repeat(60)}.webp`]);
  });

  it('treats the two ways of writing é as one name', () => {
    expect(
      pathsOf(
        [],
        [
          buildSource({ id: 's1', name: 'cafe\u0301' }),
          buildSource({ id: 's2', name: 'caf\u00e9' }),
        ],
      ),
    ).toEqual(['Unsorted/caf\u00e9.webp', 'Unsorted/caf\u00e9 (2).webp']);
  });

  it('takes the extension from the mime type first', () => {
    expect(
      pathsOf(
        [],
        [
          buildSource({
            id: 's1',
            fileName: 'clip.mov',
            mimeType: 'video/mp4',
          }),
          buildSource({
            id: 's2',
            name: 'odd',
            fileName: 'odd.heic',
            mimeType: 'image/heic',
          }),
          buildSource({
            id: 's3',
            name: 'bare',
            fileName: 'bare',
            mimeType: '',
          }),
        ],
      ),
    ).toEqual(['Unsorted/hero.mp4', 'Unsorted/odd.heic', 'Unsorted/bare']);
  });

  it('turns a website into a shortcut and its thumbnail', () => {
    const layout = buildExportLayout(
      [],
      [
        buildSource({
          id: 's1',
          name: 'Dribbble',
          kind: 'website',
          url: 'https://dribbble.com/',
          fileName: 'og-image.png',
          mimeType: 'image/png',
        }),
        buildSource({
          id: 's2',
          name: 'Plain',
          kind: 'website',
          url: 'https://example.com/',
          storageKey: null,
        }),
      ],
      EXPORTED_AT,
    );

    expect(layout.files).toEqual([
      {
        kind: 'shortcut',
        sourceId: 's1',
        path: 'Unsorted/Dribbble.url',
        text: '[InternetShortcut]\r\nURL=https://dribbble.com/\r\n',
        lastModified: new Date('2026-02-01T00:00:00.000Z'),
      },
      {
        kind: 'media',
        sourceId: 's1',
        path: 'Unsorted/Dribbble.png',
        storageKey: 'key-s1',
        lastModified: new Date('2026-02-01T00:00:00.000Z'),
      },
      {
        kind: 'shortcut',
        sourceId: 's2',
        path: 'Unsorted/Plain.url',
        text: '[InternetShortcut]\r\nURL=https://example.com/\r\n',
        lastModified: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);
  });

  it('builds a manifest that import can read', () => {
    const layout = buildExportLayout(
      [buildCollection({ id: 'c1', name: 'A', color: 'blue', saveCount: 4 })],
      [
        buildSource({
          id: 's1',
          collectionIds: ['c1'],
          tags: ['warm'],
          note: 'nice',
        }),
      ],
      EXPORTED_AT,
    );
    const manifest = exportManifestSchema.parse(layout.manifest);

    expect(manifest.collections).toEqual([
      {
        id: 'c1',
        name: 'A',
        parentId: null,
        color: 'blue',
        path: 'A',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(manifest.sources[0]).toMatchObject({
      id: 's1',
      tags: ['warm'],
      note: 'nice',
      files: [{ path: 'A/hero.webp', role: 'media' }],
    });
    expect(manifest.sources[0]).not.toHaveProperty('storageKey');
    expect(manifest.sources[0]).not.toHaveProperty('deletedAt');
    expect(manifest.exportedAt).toBe(EXPORTED_AT.toISOString());
  });
});
