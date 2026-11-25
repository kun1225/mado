import { z } from 'zod';

import { isFontFile, MAX_FONT_BYTES, MAX_FONT_MB } from './font-source';
import type { FontSourceContent } from './font-source.type';
import type { SiteSourcePreview } from './site-source.type';
import { MAX_TAG_LENGTH, normalizeTag } from './source-tags';
import { detectTextFormat, MAX_TEXT_BYTES, MAX_TEXT_MB } from './text-source';
import type { TextSourceContent } from './text-source.type';

export const MAX_FILE_MB = 512;

export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const sourceKindSchema = z.enum(['image', 'video', 'text', 'font'], {
  error: 'Only images, videos, text and font files are supported',
});

/** The kinds a dropped file can become. */
export type FileSourceKind = z.infer<typeof sourceKindSchema>;

export type SourceKind = FileSourceKind | 'website';

/** What a stored file is: the source itself, or the thumbnail of a website or text. */
export type MediaKind = 'image' | 'video';

export function detectFileKind(
  file: Pick<File, 'name' | 'type'>,
): FileSourceKind | null {
  // By name first: some systems label fonts `application/*`.
  if (isFontFile(file)) return 'font';
  const [group] = file.type.split('/');
  if (group === 'image' || group === 'video') return group;
  return detectTextFormat(file) ? 'text' : null;
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export const sourceFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'File is empty')
  .refine(
    (file) => file.size <= MAX_FILE_BYTES,
    `File must be smaller than ${MAX_FILE_MB}MB`,
  )
  .refine(
    (file) => detectFileKind(file) !== 'text' || file.size <= MAX_TEXT_BYTES,
    `Text files must be smaller than ${MAX_TEXT_MB}MB`,
  )
  .refine(
    (file) => detectFileKind(file) !== 'font' || file.size <= MAX_FONT_BYTES,
    `Font files must be smaller than ${MAX_FONT_MB}MB`,
  );

export const newSourceSchema = z.object({
  id: z.uuid().optional(),
  collectionId: z.uuid().nullable(),
  file: sourceFileSchema,
  name: z.string().trim().min(1).optional(),
  url: z.url({ protocol: /^https?$/ }).optional(),
});

export type NewSourceInput = z.infer<typeof newSourceSchema>;

export const replaceSourceFileSchema = z.object({ file: sourceFileSchema });

export const MAX_NAME_LENGTH = 120;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_URL_LENGTH = 2048;

export const newWebsiteSourceSchema = z.object({
  id: z.uuid(),
  collectionId: z.uuid().nullable(),
  url: z
    .string()
    .trim()
    .max(MAX_URL_LENGTH)
    .pipe(z.url({ protocol: /^https?$/ }))
    .refine((value) => {
      const { username, password } = new URL(value);
      return !username && !password;
    }, 'URL must not contain a user name or password'),
});

export function canEmbedSite(source: Source): boolean {
  return (
    source.kind === 'website' &&
    source.site !== undefined &&
    source.site.embed.mode !== 'none'
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

const emptyToNull = (value: string) => (value === '' ? null : value);

const collectionIdListSchema = z
  .array(z.uuid())
  .transform((ids) => [...new Set(ids)]);

const tagListSchema = z.array(z.string()).transform((tags, context) => {
  const clean = tags.map(normalizeTag);
  if (clean.some((tag) => tag === null)) {
    context.addIssue({
      code: 'custom',
      message: `Use short words, like "handmade" or "style:minimal", up to ${MAX_TAG_LENGTH} characters`,
    });
    return z.NEVER;
  }
  return [...new Set(clean as string[])];
});

// Not cleaned: an agent can write a tag outside the rules in a desktop file, and it must still be removable.
const storedTagListSchema = z
  .array(z.string())
  .transform((tags) => [...new Set(tags)]);

const MAX_PALETTE_COLORS = 5;

export const paletteSchema = z
  .array(z.string().regex(/^#[0-9a-f]{6}$/))
  .max(MAX_PALETTE_COLORS);

export const updateSourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(
        MAX_NAME_LENGTH,
        `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
      ),
    url: z
      .string()
      .trim()
      .max(MAX_URL_LENGTH)
      .refine(
        (value) => value === '' || isHttpUrl(value),
        'Enter a valid http(s) URL',
      )
      .transform(emptyToNull),
    note: z
      .string()
      .trim()
      .max(
        MAX_NOTE_LENGTH,
        `Note must be ${MAX_NOTE_LENGTH} characters or fewer`,
      )
      .transform(emptyToNull),
    collectionIds: collectionIdListSchema,
    /**
     * Prefer these over `collectionIds`. A full list built from old props
     * can undo an edit that has not shown up yet.
     */
    addCollectionIds: collectionIdListSchema,
    removeCollectionIds: collectionIdListSchema,
    addTags: tagListSchema,
    removeTags: storedTagListSchema,
    addSuggestedTags: tagListSchema,
    removeSuggestedTags: storedTagListSchema,
  })
  .partial();

export type UpdateSourceInput = z.input<typeof updateSourceSchema>;

/** Where a source card shows its name, chosen in Settings → General. */
export const SOURCE_CAPTION_POSITIONS = ['overlay', 'below'] as const;

export type SourceCaptionPosition = (typeof SOURCE_CAPTION_POSITIONS)[number];

export type Source = {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  /** Accepted tags: `group:name` or a plain name. See `source-tags.ts`. */
  tags: string[];
  /** AI ideas the user has not accepted yet. Missing on records saved before it existed. */
  suggestedTags?: string[];
  /** Main colors of the media, most used first. Missing until the detail panel first works them out. */
  palette?: string[];
  collectionIds: string[];
  kind: SourceKind;
  site?: SiteSourcePreview;
  /** The text lives in the record, and the media fields below describe its thumbnail. */
  text?: TextSourceContent;
  /** Like text, the font lives in the record: `storageKey` is null and each style has its own file. */
  font?: FontSourceContent;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  storageKey: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
