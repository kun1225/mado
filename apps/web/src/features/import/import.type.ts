import type { Collection } from '#/features/collections/collection-types';
import type { ExportManifest } from '#/features/export/export.type';
import type { Source } from '#/features/sources/source-types';

/** `path` starts with the picked folder's name, like `Trip/Day 1/beach.jpg`. */
export type ImportFile = {
  path: string;
  file: File;
};

/** Trash included, so a trashed source is never brought back as a copy. */
export type ImportExistingIds = {
  collectionIds: ReadonlySet<string>;
  sourceIds: ReadonlySet<string>;
};

export type ImportPlanInput = {
  files: ImportFile[];
  manifest: ExportManifest | null;
  existing: ImportExistingIds;
  newId: () => string;
  now: Date;
};

/**
 * `record` comes from `library.json` and keeps its id.
 * `file` comes from a plain folder and goes through `createSource`.
 */
export type ImportItem =
  | { kind: 'record'; source: Source; file: File | null }
  | { kind: 'file'; file: File; collectionId: string | null };

export type ImportPlan = {
  collections: Collection[];
  items: ImportItem[];
  /** Sources whose id is already in this library. */
  existingCount: number;
  /** Files that are not images or videos, or sources whose file is gone. */
  skippedCount: number;
};

export type ImportProgress = {
  done: number;
  total: number;
};

export type ImportResult = {
  sourceCount: number;
  collectionCount: number;
  existingCount: number;
  skippedCount: number;
  failedCount: number;
  /** A broken `library.json` falls back to the folder rule. */
  manifestUnreadable: boolean;
  /** Only plain-folder files. Files from an export were compressed before. */
  newSources: Source[];
};
