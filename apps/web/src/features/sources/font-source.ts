import { z } from 'zod';

import type {
  FontSourceContent,
  FontSourceFace,
  FontSourceFileName,
  FontSourceGroup,
  FontSourceStyle,
  FontSourceWeight,
} from './font-source.type';

// Big enough for a CJK font, small enough that loading it does not freeze the page.
export const MAX_FONT_MB = 30;

export const MAX_FONT_BYTES = MAX_FONT_MB * 1024 * 1024;

export const DEFAULT_FONT_SAMPLE =
  'The quick brown fox jumps over the lazy dog';

export const MAX_FONT_SAMPLE_LENGTH = 200;

/** The card and the viewer share this shape, so the dialog can fly from the card. */
export const FONT_CARD_RATIO = 4 / 3;

// `.ttc` is left out: `FontFace` cannot pick one face inside a collection.
// Browsers give fonts many MIME types or none, so react-dropzone also checks the extension.
export const FONT_FILE_ACCEPT: Record<string, string[]> = {
  'font/ttf': ['.ttf'],
  'font/otf': ['.otf'],
  'font/woff': ['.woff'],
  'font/woff2': ['.woff2'],
};

const FONT_EXTENSIONS = Object.values(FONT_FILE_ACCEPT).flat();

// A variable font covers every weight.
const VARIABLE_WEIGHT: [number, number] = [100, 900];

const WEIGHT_BY_WORD: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  book: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  heavy: 800,
  black: 900,
};

const WEIGHT_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

// Longest first, so "ExtraBold" is not read as "Bold".
const WEIGHT_WORDS = Object.keys(WEIGHT_BY_WORD).sort(
  (first, second) => second.length - first.length,
);

export function isFontFile(file: Pick<File, 'name'>): boolean {
  return FONT_EXTENSIONS.includes(toExtension(file.name));
}

/** `Inter-SemiBoldItalic.woff2` → Inter, 600, italic. Fonts are not parsed, so the name is all we know. */
export function parseFontFileName(name: string): FontSourceFileName {
  const fallback = name.replace(/\.[^.]+$/, '') || name;
  let stem = fallback;
  let weight: FontSourceWeight | null = null;

  const variable = /(\[[^\]]*\]|[-_ ]?(variable|vf))$/i;
  if (variable.test(stem)) {
    stem = stem.replace(variable, '');
    weight = VARIABLE_WEIGHT;
  }

  const italic = /[-_ ]?(italic|oblique)$/i;
  const style: FontSourceStyle = italic.test(stem) ? 'italic' : 'normal';
  stem = stem.replace(italic, '');

  const word = WEIGHT_WORDS.find((candidate) =>
    toWordKey(stem).endsWith(candidate),
  );
  const rest = word ? cutWord(stem, word) : null;
  if (word && rest !== null) {
    weight ??= WEIGHT_BY_WORD[word];
    stem = rest;
  }

  const family = stem.replace(/[-_ ]+$/, '');
  return { family: family || fallback, weight: weight ?? 400, style };
}

// *** toWordKey ***
// "Semi Bold", "semi-bold" and "SemiBold" all match "semibold".
function toWordKey(text: string): string {
  return text.toLowerCase().replace(/[-_ ]/g, '');
}

// *** cutWord ***
// Walks back over the letters of `word`, skipping separators, so "Semi Bold" is cut whole.
// `null` when the word is only the end of another word, like "bold" in "Kobold".
function cutWord(stem: string, word: string): string | null {
  let index = stem.length;
  for (let letters = 0; letters < word.length; index -= 1) {
    if (!/[-_ ]/.test(stem[index - 1])) letters += 1;
  }
  const startsWord =
    index === 0 || /[-_ ]/.test(stem[index - 1]) || /[A-Z]/.test(stem[index]);
  return startsWord ? stem.slice(0, index) : null;
}

/** Groups by family, ignoring case. A file alone is a family of one. */
export function groupFontFiles(files: File[]): FontSourceGroup[] {
  const groups = new Map<string, FontSourceGroup>();

  for (const file of files) {
    const { family, weight, style } = parseFontFileName(file.name);
    const key = family.toLowerCase();
    const group = groups.get(key) ?? { family, files: [] };
    groups.set(key, {
      ...group,
      files: [...group.files, { file, weight, style }],
    });
  }

  return [...groups.values()];
}

export const fontSampleSchema = z
  .string()
  .trim()
  .max(
    MAX_FONT_SAMPLE_LENGTH,
    `Keep the sentence under ${MAX_FONT_SAMPLE_LENGTH} characters`,
  )
  .transform((sample) => (sample === '' ? null : sample));

export async function loadFontFace(
  family: string,
  data: ArrayBuffer,
  face?: Pick<FontSourceFace, 'weight' | 'style'>,
): Promise<FontFace> {
  try {
    return await new FontFace(
      family,
      data,
      face && toFontDescriptors(face),
    ).load();
  } catch (error) {
    throw new Error('This font file could not be read.', { cause: error });
  }
}

// *** toFontDescriptors ***
function toFontDescriptors({
  weight,
  style,
}: Pick<FontSourceFace, 'weight' | 'style'>): FontFaceDescriptors {
  return {
    weight: Array.isArray(weight) ? weight.join(' ') : String(weight),
    style,
  };
}

/** One CSS family per source, so the browser picks the file from weight and style, and two "Inter" never clash. */
export function toFontFamily(sourceId: string): string {
  return `mado-font-${sourceId}`;
}

/** The user's pick, while that style still exists, or the style closest to Regular. */
export function toCoverFace(font: FontSourceContent): FontSourceFace {
  return (
    font.faces.find((face) => face.storageKey === font.coverFace) ??
    [...font.faces].sort(
      (first, second) =>
        distanceFromRegular(first) - distanceFromRegular(second) ||
        compareStyle(first, second),
    )[0]
  );
}

// *** distanceFromRegular ***
function distanceFromRegular({ weight }: FontSourceFace): number {
  if (Array.isArray(weight))
    return weight[0] <= 400 && 400 <= weight[1] ? 0 : 500;
  return Math.abs(weight - 400);
}

// *** compareStyle ***
function compareStyle(first: FontSourceFace, second: FontSourceFace): number {
  return Number(first.style === 'italic') - Number(second.style === 'italic');
}

export function sortFontFaces(faces: FontSourceFace[]): FontSourceFace[] {
  return [...faces].sort(
    (first, second) =>
      toWeightNumber(first.weight) - toWeightNumber(second.weight) ||
      compareStyle(first, second),
  );
}

// *** toWeightNumber ***
function toWeightNumber(weight: FontSourceWeight): number {
  return Array.isArray(weight) ? weight[0] : weight;
}

export function isSameFontStyle(
  first: Pick<FontSourceFace, 'weight' | 'style'>,
  second: Pick<FontSourceFace, 'weight' | 'style'>,
): boolean {
  return (
    String(first.weight) === String(second.weight) &&
    first.style === second.style
  );
}

/** "Bold Italic", "Variable 100–900". */
export function toFontStyleName({
  weight,
  style,
}: Pick<FontSourceFace, 'weight' | 'style'>): string {
  const italic = style === 'italic' ? 'Italic' : '';
  if (Array.isArray(weight)) {
    return [`Variable ${weight[0]}–${weight[1]}`, italic]
      .filter(Boolean)
      .join(' ');
  }
  const name = WEIGHT_NAMES[weight] ?? String(weight);
  // "Italic" alone reads better than "Regular Italic".
  if (italic && weight === 400) return italic;
  return [name, italic].filter(Boolean).join(' ');
}

/** The CSS a face is drawn with, once its family is loaded. */
export function toFontFaceStyle(
  family: string,
  { weight, style }: Pick<FontSourceFace, 'weight' | 'style'>,
): { fontFamily: string; fontWeight: number; fontStyle: FontSourceStyle } {
  return {
    fontFamily: `"${family}"`,
    // A variable face is shown at Regular, or at its lightest when 400 is outside its range.
    fontWeight: Array.isArray(weight)
      ? Math.min(Math.max(400, weight[0]), weight[1])
      : weight,
    fontStyle: style,
  };
}

// *** toExtension ***
function toExtension(name: string): string {
  return /\.[^.]+$/.exec(name)?.[0].toLowerCase() ?? '';
}
