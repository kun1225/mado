import type { Source } from './source-types';

export type FontSourceStyle = 'normal' | 'italic';

/** A single number, or a range for a variable font. */
export type FontSourceWeight = number | [number, number];

/** One style of the family, stored as its own file in `media/<storageKey>`. */
export type FontSourceFace = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  weight: FontSourceWeight;
  style: FontSourceStyle;
};

export type FontSourceContent = {
  family: string;
  /** The cover sentence. `null` shows the default one. */
  sample: string | null;
  /** The `storageKey` of the style that draws the cover. `null` lets Mado pick. */
  coverFace: string | null;
  /** At least one, sorted by weight, then upright before italic. */
  faces: FontSourceFace[];
};

/** What the file name tells us, since fonts are not parsed. */
export type FontSourceFileName = {
  family: string;
  weight: FontSourceWeight;
  style: FontSourceStyle;
};

export type FontSourceFile = {
  file: File;
  weight: FontSourceWeight;
  style: FontSourceStyle;
};

/** Files dropped together that share a family name become one source. */
export type FontSourceGroup = {
  family: string;
  files: FontSourceFile[];
};

/** `error` is the first file that was skipped, so the user hears why a style is missing. */
export type FontSourceResult = { source: Source; error: unknown };
