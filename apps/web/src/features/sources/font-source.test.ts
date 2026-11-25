import { describe, expect, it } from 'vitest';

import {
  fontSampleSchema,
  groupFontFiles,
  isFontFile,
  parseFontFileName,
  sortFontFaces,
  toCoverFace,
  toFontStyleName,
} from './font-source';
import type { FontSourceContent, FontSourceFace } from './font-source.type';

function face(
  storageKey: string,
  weight: FontSourceFace['weight'],
  style: FontSourceFace['style'] = 'normal',
): FontSourceFace {
  return {
    storageKey,
    fileName: `${storageKey}.woff2`,
    mimeType: 'font/woff2',
    sizeBytes: 10,
    weight,
    style,
  };
}

function font(
  faces: FontSourceFace[],
  coverFace: string | null = null,
): FontSourceContent {
  return { family: 'Inter', sample: null, coverFace, faces };
}

describe('parseFontFileName', () => {
  it.each([
    ['Inter-Regular.woff2', 'Inter', 400, 'normal'],
    ['Inter-SemiBoldItalic.woff2', 'Inter', 600, 'italic'],
    ['Inter_Bold.ttf', 'Inter', 700, 'normal'],
    ['NotoSansTC-Light.otf', 'NotoSansTC', 300, 'normal'],
    ['Inter-Italic.otf', 'Inter', 400, 'italic'],
    ['Inter-ExtraBold.woff', 'Inter', 800, 'normal'],
    ['Inter Semi Bold.ttf', 'Inter', 600, 'normal'],
    ['inter-black.ttf', 'inter', 900, 'normal'],
    ['MyBrandFont.otf', 'MyBrandFont', 400, 'normal'],
    ['Kobold.otf', 'Kobold', 400, 'normal'],
    ['bold.ttf', 'bold', 700, 'normal'],
  ] as const)('reads %s', (name, family, weight, style) => {
    expect(parseFontFileName(name)).toEqual({ family, weight, style });
  });

  it.each(['Inter[wght].woff2', 'Inter-Variable.ttf', 'Inter-VF.ttf'])(
    'gives the variable font %s every weight',
    (name) => {
      expect(parseFontFileName(name)).toEqual({
        family: 'Inter',
        weight: [100, 900],
        style: 'normal',
      });
    },
  );

  it('reads a variable italic', () => {
    expect(parseFontFileName('Inter-Italic[wght].woff2')).toEqual({
      family: 'Inter',
      weight: [100, 900],
      style: 'italic',
    });
  });
});

describe('groupFontFiles', () => {
  it('groups by family, ignoring case', () => {
    const groups = groupFontFiles([
      new File(['a'], 'Inter-Regular.woff2'),
      new File(['b'], 'inter-Bold.woff2'),
      new File(['c'], 'Fraunces-Black.ttf'),
    ]);

    expect(
      groups.map((group) => ({
        family: group.family,
        files: group.files.map(({ file, weight }) => [file.name, weight]),
      })),
    ).toEqual([
      {
        family: 'Inter',
        files: [
          ['Inter-Regular.woff2', 400],
          ['inter-Bold.woff2', 700],
        ],
      },
      { family: 'Fraunces', files: [['Fraunces-Black.ttf', 900]] },
    ]);
  });
});

describe('isFontFile', () => {
  it.each([
    ['a.ttf', true],
    ['a.OTF', true],
    ['a.woff', true],
    ['a.woff2', true],
    ['a.ttc', false],
    ['a.png', false],
  ])('%s → %s', (name, expected) => {
    expect(isFontFile({ name })).toBe(expected);
  });
});

describe('toCoverFace', () => {
  it('picks the style closest to Regular, upright first', () => {
    const faces = [
      face('bold', 700),
      face('italic', 400, 'italic'),
      face('regular', 400),
    ];

    expect(toCoverFace(font(faces)).storageKey).toBe('regular');
  });

  it('counts a variable font that covers 400 as Regular', () => {
    const faces = [face('light', 300), face('variable', [100, 900])];

    expect(toCoverFace(font(faces)).storageKey).toBe('variable');
  });

  it("uses the user's pick while it exists", () => {
    const faces = [face('regular', 400), face('bold', 700)];

    expect(toCoverFace(font(faces, 'bold')).storageKey).toBe('bold');
    expect(toCoverFace(font(faces, 'gone')).storageKey).toBe('regular');
  });
});

describe('sortFontFaces', () => {
  it('sorts by weight, then upright before italic', () => {
    const sorted = sortFontFaces([
      face('bold', 700),
      face('italic', 400, 'italic'),
      face('regular', 400),
    ]);

    expect(sorted.map(({ storageKey }) => storageKey)).toEqual([
      'regular',
      'italic',
      'bold',
    ]);
  });
});

describe('toFontStyleName', () => {
  it.each([
    [400, 'normal', 'Regular'],
    [400, 'italic', 'Italic'],
    [700, 'italic', 'Bold Italic'],
    [[100, 900], 'normal', 'Variable 100–900'],
  ] as const)('%s %s → %s', (weight, style, expected) => {
    expect(toFontStyleName({ weight: weight as never, style })).toBe(expected);
  });
});

describe('fontSampleSchema', () => {
  it('trims, and saves an empty sentence as the default', () => {
    expect(fontSampleSchema.parse('  Hello  ')).toBe('Hello');
    expect(fontSampleSchema.parse('   ')).toBeNull();
  });

  it('rejects a sentence over 200 characters', () => {
    expect(fontSampleSchema.safeParse('a'.repeat(201)).success).toBe(false);
  });
});
