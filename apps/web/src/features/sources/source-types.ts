import { z } from 'zod';

import type { SiteSourcePreview } from './site-source.type';
import { detectTextFormat, MAX_TEXT_BYTES, MAX_TEXT_MB } from './text-source';
import type { TextSourceContent } from './text-source.type';

export const MAX_FILE_MB = 512;

export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const sourceKindSchema = z.enum(['image', 'video', 'text'], {
  error: 'Only images, videos and text files are supported',
});

/** The kinds a dropped file can become. */
export type FileSourceKind = z.infer<typeof sourceKindSchema>;

export type SourceKind = FileSourceKind | 'website';

/** What a stored file is: the source itself, or the thumbnail of a website or text. */
export type MediaKind = 'image' | 'video';

export function detectFileKind(
  file: Pick<File, 'name' | 'type'>,
): FileSourceKind | null {
  const [group] = file.type.split('/');
  if (group === 'image' || group === 'video') return group;
  return detectTextFormat(file) ? 'text' : null;
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

const sourceFileSchema = z
  .instanceof(File)
  .refine((file) => file.size > 0, 'File is empty')
  .refine(
    (file) => file.size <= MAX_FILE_BYTES,
    `File must be smaller than ${MAX_FILE_MB}MB`,
  )
  .refine(
    (file) => detectFileKind(file) !== 'text' || file.size <= MAX_TEXT_BYTES,
    `Text files must be smaller than ${MAX_TEXT_MB}MB`,
  );

export const newSourceSchema = z.object({
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
  })
  .partial();

export type UpdateSourceInput = z.input<typeof updateSourceSchema>;

export type Source = {
  id: string;
  name: string;
  url: string | null;
  note: string | null;
  tags: string[];
  collectionIds: string[];
  kind: SourceKind;
  site?: SiteSourcePreview;
  /** The text lives in the record, and the media fields below describe its thumbnail. */
  text?: TextSourceContent;
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
