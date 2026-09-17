import { z } from 'zod';

export const MAX_FILE_MB = 512;

const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

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

export type Source = {
  id: string;
  collectionId: string | null;
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
