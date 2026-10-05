import { z } from 'zod';

export const MAX_FILE_MB = 512;

export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const sourceKindSchema = z.enum(['image', 'video'], {
  error: 'Only images and videos are supported',
});

export type SourceKind = z.infer<typeof sourceKindSchema>;

export const newSourceSchema = z.object({
  /** Null means the source was added at the library level, outside any collection. */
  collectionId: z.uuid().nullable(),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'File is empty')
    .refine(
      (file) => file.size <= MAX_FILE_BYTES,
      `File must be smaller than ${MAX_FILE_MB}MB`,
    ),
});

export type NewSourceInput = z.infer<typeof newSourceSchema>;

export const MAX_NAME_LENGTH = 120;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_URL_LENGTH = 2048;
export const MAX_TAG_LENGTH = 40;
export const MAX_TAGS = 20;

/** "#Brand Kit " -> "brand kit" */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().toLowerCase();
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

const tagLimitsSchema = z
  .array(z.string().max(MAX_TAG_LENGTH, 'Tag is too long'))
  .max(MAX_TAGS, `Use ${MAX_TAGS} tags or fewer`);

const tagListSchema = z
  .array(z.string())
  .transform((tags) => [
    ...new Set(tags.map(normalizeTag).filter((tag) => tag !== '')),
  ]);

const collectionIdListSchema = z
  .array(z.uuid())
  .transform((ids) => [...new Set(ids)]);

export const tagsSchema = tagListSchema.pipe(tagLimitsSchema);

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
    tags: tagsSchema,
    collectionIds: collectionIdListSchema,
    /**
     * Changes to a list, applied to the stored value inside the save. Prefer
     * these over `tags` and `collectionIds`: a full list built from stale props
     * can undo an edit that has not shown up yet.
     */
    addTags: tagListSchema,
    removeTags: tagListSchema,
    addCollectionIds: collectionIdListSchema,
    removeCollectionIds: collectionIdListSchema,
  })
  .partial();

export type UpdateSourceInput = z.input<typeof updateSourceSchema>;

export type Source = {
  id: string;
  /** Display name, editable. `fileName` is the stored file's name and only changes when compression changes its format. */
  name: string;
  url: string | null;
  note: string | null;
  tags: string[];
  /** Empty means the source lives only in the library. */
  collectionIds: string[];
  kind: SourceKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  /** Name of the file inside the OPFS media directory. */
  storageKey: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
