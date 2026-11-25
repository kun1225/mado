import { z } from 'zod';

import { COLLECTION_COLORS } from '#/features/collections/collection-types';

export const EXPORT_MANIFEST_NAME = 'library.json';

export const EXPORT_MANIFEST_FORMAT = 'mado-export';

// Raise this when the shape changes, so a future import can still read old exports.
// 2: text sources (the `text` kind and file role).
// 3: font sources (the `font` kind and file role, and `face` on a font file).
export const EXPORT_MANIFEST_VERSION = 3;

/**
 * Export builds `library.json` with this schema and import checks it.
 * One schema keeps the two from drifting apart, and users can edit the file by hand.
 */
export const exportManifestSchema = z.object({
  format: z.literal(EXPORT_MANIFEST_FORMAT),
  // Every older version is a subset of this one, so all of them still import.
  version: z.number().int().min(1).max(EXPORT_MANIFEST_VERSION),
  exportedAt: z.iso.datetime(),
  collections: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullable(),
      color: z.enum(COLLECTION_COLORS).nullable(),
      /** Inside the top folder, so renaming that folder after unzipping breaks nothing. */
      path: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  sources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(['image', 'video', 'website', 'text', 'font']),
      url: z.string().nullable(),
      note: z.string().nullable(),
      tags: z.array(z.string()),
      collectionIds: z.array(z.string()),
      site: z
        .object({
          url: z.string(),
          finalUrl: z.string(),
          domain: z.string(),
          title: z.string().nullable(),
          description: z.string().nullable(),
          favicon: z.string().nullable(),
          ogImage: z.string().nullable(),
          embed: z.discriminatedUnion('mode', [
            z.object({ mode: z.enum(['provider', 'iframe']), src: z.string() }),
            z.object({ mode: z.literal('none'), reason: z.string() }),
          ]),
          video: z
            .object({ url: z.string(), title: z.string() })
            .nullable()
            .optional(),
        })
        .optional(),
      /** The body is in the `text` file, so a hand edit to that file is what gets imported. */
      text: z
        .object({
          format: z.enum(['markdown', 'plain']),
          fileName: z.string(),
        })
        .optional(),
      /** `coverFace` and each file's `face` are indexes into `faces`, since storage keys stay on the device. */
      font: z
        .object({
          family: z.string(),
          sample: z.string().nullable(),
          coverFace: z.number().int().min(0).nullable(),
          faces: z.array(
            z.object({
              fileName: z.string(),
              mimeType: z.string(),
              weight: z.union([z.number(), z.tuple([z.number(), z.number()])]),
              style: z.enum(['normal', 'italic']),
            }),
          ),
        })
        .optional(),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      durationSeconds: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      /** A source in two collections has its media in both folders. */
      files: z.array(
        z.object({
          path: z.string(),
          role: z.enum(['media', 'shortcut', 'text', 'font']),
          face: z.number().int().min(0).optional(),
        }),
      ),
    }),
  ),
  /** Files that were gone from this device while exporting. */
  missingFiles: z.array(z.string()),
});
