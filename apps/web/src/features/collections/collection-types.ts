import { z } from 'zod';

/** Names, not hex values, so each one maps to a theme token for light and dark. */
export const COLLECTION_COLORS = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export const MAX_COLLECTION_NAME_LENGTH = 100;

export type Collection = {
  id: string;
  name: string;
  parentId: string | null;
  /** `null` is the default gray. Records saved before colors read as `null`. */
  color: CollectionColor | null;
  /** Counted from the sources on each read, so it never goes out of sync. */
  saveCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCollectionInput = {
  name?: string;
  parentId?: string;
};

export const updateCollectionSchema = z.strictObject({
  name: z.string().trim().min(1).max(MAX_COLLECTION_NAME_LENGTH).optional(),
  color: z.enum(COLLECTION_COLORS).nullable().optional(),
});

export type UpdateCollectionInput = z.input<typeof updateCollectionSchema>;
