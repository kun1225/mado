import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Source } from './source-types';

let createSources: typeof import('./source-actions').createSources;
let hardDeleteSource: typeof import('./source-actions').hardDeleteSource;
let replaceSourceFile: typeof import('./source-actions').replaceSourceFile;
let addFontFaces: typeof import('./font-actions').addFontFaces;
let removeFontFace: typeof import('./font-actions').removeFontFace;
let updateFontSample: typeof import('./font-actions').updateFontSample;
let updateFontCover: typeof import('./font-actions').updateFontCover;
let writeMediaFile: typeof import('./source-media').writeMediaFile;
let deleteMediaFile: typeof import('./source-media').deleteMediaFile;

const COLLECTION_ID = '11111111-1111-4111-8111-111111111111';

vi.mock('./source-media', () => ({
  isMediaStorageSupported: false,
  compressMedia: vi.fn((file: File) => Promise.resolve(file)),
  deleteMediaFile: vi.fn(() => Promise.resolve()),
  readMediaFile: vi.fn(),
  writeMediaFile: vi.fn(() => Promise.resolve()),
}));

// jsdom has no FontFace. A file whose text is "broken" fails like a bad font.
class FakeFontFace {
  constructor(
    readonly family: string,
    private readonly data: ArrayBuffer,
  ) {}
  load() {
    return new TextDecoder().decode(this.data) === 'broken'
      ? Promise.reject(new Error('bad font'))
      : Promise.resolve(this);
  }
}

function fontFile(name: string, content = 'font') {
  return { collectionId: COLLECTION_ID, file: new File([content], name) };
}

async function createInter(): Promise<Source> {
  const { sources } = await createSources([
    fontFile('Inter-Regular.woff2'),
    fontFile('Inter-Bold.woff2'),
  ]);
  return sources[0];
}

beforeEach(async () => {
  vi.resetModules();
  indexedDB = new IDBFactory();
  vi.stubGlobal('FontFace', FakeFontFace);

  ({ createSources, hardDeleteSource, replaceSourceFile } =
    await import('./source-actions'));
  ({ addFontFaces, removeFontFace, updateFontSample, updateFontCover } =
    await import('./font-actions'));
  ({ writeMediaFile, deleteMediaFile } = await import('./source-media'));
  vi.mocked(writeMediaFile).mockClear();
  vi.mocked(deleteMediaFile).mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createSources with font files', () => {
  it('makes one source per family, with a file per style', async () => {
    const { sources, error } = await createSources([
      fontFile('Inter-Regular.woff2'),
      fontFile('Inter-BoldItalic.woff2'),
      fontFile('Fraunces-Black.ttf'),
      {
        collectionId: COLLECTION_ID,
        file: new File(['text'], 'note.txt', { type: 'text/plain' }),
      },
    ]);

    expect(error).toBeUndefined();
    expect(sources.map(({ kind, name }) => [kind, name])).toEqual([
      ['text', 'note'],
      ['font', 'Inter'],
      ['font', 'Fraunces'],
    ]);
    const inter = sources[1];
    expect(inter).toMatchObject({
      storageKey: null,
      collectionIds: [COLLECTION_ID],
      sizeBytes: 8,
      font: { family: 'Inter', sample: null, coverFace: null },
    });
    expect(
      inter.font?.faces.map(({ fileName, weight, style }) => [
        fileName,
        weight,
        style,
      ]),
    ).toEqual([
      ['Inter-Regular.woff2', 400, 'normal'],
      ['Inter-BoldItalic.woff2', 700, 'italic'],
    ]);
    expect(writeMediaFile).toHaveBeenCalledTimes(3);
  });

  it('skips a broken file and a repeated style, and keeps the rest', async () => {
    const { sources, error } = await createSources([
      fontFile('Inter-Regular.woff2'),
      fontFile('Inter-Bold.woff2', 'broken'),
      fontFile('Inter Regular.woff2'),
    ]);

    expect(sources[0].font?.faces).toHaveLength(1);
    expect(error).toMatchObject({
      message: 'This font file could not be read.',
    });
  });

  it('says a style is already there', async () => {
    const { error } = await createSources([
      fontFile('Inter-Regular.woff2'),
      fontFile('Inter Regular.woff2'),
    ]);

    expect(error).toMatchObject({
      message: 'Inter Regular is already in this font.',
    });
  });

  it('makes no source when every file fails', async () => {
    const { sources, error } = await createSources([
      fontFile('Inter-Bold.woff2', 'broken'),
    ]);

    expect(sources).toEqual([]);
    expect(error).toBeInstanceOf(Error);
    expect(writeMediaFile).not.toHaveBeenCalled();
  });

  it('rejects a font over 30MB', async () => {
    const big = new File([new Uint8Array(30 * 1024 * 1024 + 1)], 'Big.ttf');

    const { error } = await createSources([{ collectionId: null, file: big }]);

    expect(error).toMatchObject({
      issues: [{ message: 'Font files must be smaller than 30MB' }],
    });
  });
});

describe('addFontFaces', () => {
  it('adds new styles in order and skips ones it has', async () => {
    const inter = await createInter();

    const { source, error } = await addFontFaces(inter.id, [
      new File(['font'], 'Inter-Light.woff2'),
      new File(['font'], 'Other-Bold.woff2'),
    ]);

    expect(source.font?.faces.map(({ weight }) => weight)).toEqual([
      300, 400, 700,
    ]);
    expect(source.sizeBytes).toBe(12);
    expect(error).toMatchObject({
      message: 'Inter Bold is already in this font.',
    });
  });
  it('deletes the new files when the font is gone before the save', async () => {
    const inter = await createInter();
    vi.mocked(deleteMediaFile).mockClear();
    const adding = addFontFaces(inter.id, [
      new File(['font'], 'Inter-Light.woff2'),
    ]);
    await hardDeleteSource(inter.id);

    await expect(adding).rejects.toThrow('Source not found');
    const written = vi.mocked(writeMediaFile).mock.calls.at(-1)?.[0];
    expect(vi.mocked(deleteMediaFile).mock.calls.map(([key]) => key)).toContain(
      written,
    );
  });

  it('deletes a half-written file when a write fails', async () => {
    const inter = await createInter();
    vi.mocked(writeMediaFile).mockRejectedValueOnce(new Error('disk full'));

    await expect(
      addFontFaces(inter.id, [new File(['font'], 'Inter-Light.woff2')]),
    ).rejects.toThrow('disk full');
    const written = vi.mocked(writeMediaFile).mock.calls.at(-1)?.[0];
    expect(deleteMediaFile).toHaveBeenCalledWith(written);
  });

  it('says so when another tab added the same style meanwhile', async () => {
    const inter = await createInter();
    const [first, second] = await Promise.all([
      addFontFaces(inter.id, [new File(['font'], 'Inter-Light.woff2')]),
      addFontFaces(inter.id, [new File(['font'], 'Inter-Light.woff2')]),
    ]);

    expect(second.source.font?.faces).toHaveLength(3);
    expect([first.error, second.error].filter(Boolean)).toMatchObject([
      { message: 'Inter Light is already in this font.' },
    ]);
  });
});

describe('removeFontFace', () => {
  it('removes a style, deletes its file after the save, and resets the cover', async () => {
    const inter = await createInter();
    const bold = inter.font?.faces[1].storageKey ?? '';
    await updateFontCover(inter.id, bold);

    const source = await removeFontFace(inter.id, bold);

    expect(source.font?.faces).toHaveLength(1);
    expect(source.font?.coverFace).toBeNull();
    expect(source.sizeBytes).toBe(4);
    expect(deleteMediaFile).toHaveBeenCalledWith(bold);
  });

  it('keeps the last style', async () => {
    const { sources } = await createSources([fontFile('Inter-Regular.woff2')]);
    const only = sources[0].font?.faces[0].storageKey ?? '';

    await expect(removeFontFace(sources[0].id, only)).rejects.toThrow(
      'A font needs at least one style.',
    );
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });

  it('never deletes a file the font does not own', async () => {
    const inter = await createInter();

    await expect(removeFontFace(inter.id, 'someone-else')).rejects.toThrow();
    expect(deleteMediaFile).not.toHaveBeenCalled();
  });
});

describe('updateFontSample', () => {
  it('trims, and saves an empty sentence as the default', async () => {
    const inter = await createInter();

    expect((await updateFontSample(inter.id, '  Hi  ')).font?.sample).toBe(
      'Hi',
    );
    expect((await updateFontSample(inter.id, ' ')).font?.sample).toBeNull();
  });

  it('rejects a sentence over 200 characters', async () => {
    const inter = await createInter();

    await expect(updateFontSample(inter.id, 'a'.repeat(201))).rejects.toThrow();
  });
});

describe('updateFontCover', () => {
  it('rejects a style the font does not have', async () => {
    const inter = await createInter();

    await expect(updateFontCover(inter.id, 'gone')).rejects.toThrow(
      'That style is no longer in this font.',
    );
  });
});

describe('fonts and the other source actions', () => {
  it('deletes every style file on a hard delete', async () => {
    const inter = await createInter();

    await hardDeleteSource(inter.id);

    expect(vi.mocked(deleteMediaFile).mock.calls.map(([key]) => key)).toEqual(
      inter.font?.faces.map(({ storageKey }) => storageKey),
    );
  });

  it('never replaces a font, and never uses a font to replace a file', async () => {
    const inter = await createInter();

    await expect(
      replaceSourceFile(
        inter.id,
        new File(['png'], 'a.png', { type: 'image/png' }),
      ),
    ).rejects.toThrow('Add font files to a font instead.');
    await expect(
      replaceSourceFile(inter.id, new File(['font'], 'Inter-Light.woff2')),
    ).rejects.toThrow("Fonts can't replace a file.");
  });
});
